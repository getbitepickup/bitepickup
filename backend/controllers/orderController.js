const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const {
  generateOrderReference,
  calculateOrderTotals,
} = require("../utils/helpers");
const {
  HTTP_STATUS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  ORDER_STATUS,
} = require("../utils/constants");
const logger = require("../utils/logger");
const mongoose = require("mongoose");
const {
  sendOrderConfirmationEmail,
  sendOrderReadyEmail,
} = require("../services/emailService");
const {
  createPaymentIntentForRestaurant,
} = require("../services/stripeConnectService");

// ✅ IMPORT SSE CONTROLLER
const {
  broadcastNewOrder,
  broadcastOrderStatusUpdate,
} = require("./sseController");

/**
 * Helper function to resolve restaurantId from user object
 * Handles all possible formats: string, ObjectId, object with _id/id
 */
const resolveRestaurantId = (user) => {
  if (!user) return null;

  // If user has restaurantId directly as string
  if (typeof user.restaurantId === "string") {
    return user.restaurantId;
  }

  // If user has restaurantId as object with _id
  if (user.restaurantId && typeof user.restaurantId === "object") {
    if (user.restaurantId._id) {
      return user.restaurantId._id.toString();
    }
    if (user.restaurantId.id) {
      return user.restaurantId.id.toString();
    }
    // Try to convert whole object to string
    if (
      user.restaurantId.toString &&
      user.restaurantId.toString() !== "[object Object]"
    ) {
      return user.restaurantId.toString();
    }
  }

  return null;
};

/**
 * @desc    Get all orders (with permission check)
 * @route   GET /api/orders
 * @access  Admin or Restaurant Owner
 */
exports.getOrders = async (req, res) => {
  try {
    const { restaurantId, status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // ✅ LOG for debugging
    console.log("🔍 getOrders called with:", {
      restaurantId: restaurantId,
      status: status,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      userRestaurantId: req.user?.restaurantId,
      userRestaurantIdType: typeof req.user?.restaurantId,
    });

    const filter = {};

    // ============================================
    // STEP 1: RESOLVE THE USER'S RESTAURANT ID
    // ============================================
    let userRestaurantId = null;

    if (req.user) {
      // Try to get restaurantId from user object
      userRestaurantId = resolveRestaurantId(req.user);

      // If still null and user is restaurant_owner, fetch from database
      if (!userRestaurantId && req.user.role === "restaurant_owner") {
        try {
          const userDoc = await User.findById(req.user._id).populate(
            "restaurantId",
          );
          if (userDoc) {
            userRestaurantId = resolveRestaurantId(userDoc);
            // Update req.user for future use
            if (userRestaurantId) {
              req.user.restaurantId = userRestaurantId;
              console.log(
                "🔄 Fetched restaurantId from database:",
                userRestaurantId,
              );
            }
          }
        } catch (err) {
          console.log(
            "⚠️ Could not fetch restaurantId from database:",
            err.message,
          );
        }
      }
    }

    console.log("🔑 Resolved userRestaurantId:", userRestaurantId);

    // ============================================
    // STEP 2: BUILD FILTER
    // ============================================

    // If restaurantId is provided in query params, use it
    if (restaurantId) {
      // Try to find the restaurant by various identifiers
      let restaurantDoc = null;

      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        restaurantDoc = await Restaurant.findById(restaurantId);
      }

      if (!restaurantDoc) {
        restaurantDoc = await Restaurant.findOne({
          $or: [
            { slug: restaurantId },
            { subdomain: restaurantId },
            { id: restaurantId },
          ],
        });
      }

      if (restaurantDoc) {
        filter.restaurantId = restaurantDoc._id;
        console.log("✅ Found restaurant by ID:", restaurantDoc._id);
      } else {
        filter.restaurantId = restaurantId;
        console.log("⚠️ Using raw restaurantId:", restaurantId);
      }
    }

    // ============================================
    // STEP 3: APPLY PERMISSION CHECKS
    // ============================================

    if (req.user) {
      // Admin can see all orders
      if (req.user.role === "admin") {
        console.log("👑 Admin user, no restriction");
      }
      // Restaurant owner can only see their own orders
      else if (req.user.role === "restaurant_owner") {
        console.log("🔒 Restaurant owner, applying restriction...");

        if (!userRestaurantId) {
          console.log("❌ User has no restaurantId assigned");
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            message:
              "You do not have a restaurant assigned to your account. Please contact the administrator.",
          });
        }

        const userRestaurantIdStr = userRestaurantId.toString();

        // If filter already has restaurantId, check if user owns it
        if (filter.restaurantId) {
          const filterRestaurantIdStr = filter.restaurantId.toString();

          if (filterRestaurantIdStr !== userRestaurantIdStr) {
            console.log(
              `❌ Permission denied: user ${userRestaurantIdStr} tried to access ${filterRestaurantIdStr}`,
            );
            return res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              message:
                "You do not have permission to view orders for this restaurant",
            });
          }
        } else {
          // No restaurant filter, restrict to user's restaurant
          if (mongoose.Types.ObjectId.isValid(userRestaurantIdStr)) {
            filter.restaurantId = new mongoose.Types.ObjectId(
              userRestaurantIdStr,
            );
          } else {
            filter.restaurantId = userRestaurantIdStr;
          }
          console.log(
            "✅ Filter set to user's restaurant:",
            filter.restaurantId,
          );
        }
      } else {
        // Unknown role
        console.log("⚠️ Unknown role:", req.user.role);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to view orders",
        });
      }
    } else {
      // No user (should not happen with auth middleware)
      console.log("⚠️ No user object found");
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    console.log("📊 Final filter:", JSON.stringify(filter));

    // ============================================
    // STEP 4: FETCH ORDERS
    // ============================================

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(filter);

    console.log(`📊 Found ${orders.length} orders for user ${req.user?.email}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Get orders error: ${error.message}`);
    console.error("❌ Get orders error details:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

/**
 * @desc    Get orders by restaurant
 * @route   GET /api/orders/restaurant/:restaurantId
 * @access  Restaurant Owner or Admin
 */
exports.getOrdersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    console.log("📊 Fetching orders for restaurantId:", restaurantId);

    // Find the actual restaurant by various identifiers
    let restaurantDoc = null;

    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurantDoc = await Restaurant.findById(restaurantId);
    }

    if (!restaurantDoc) {
      restaurantDoc = await Restaurant.findOne({
        $or: [
          { slug: restaurantId },
          { subdomain: restaurantId },
          { id: restaurantId },
        ],
      });
    }

    if (!restaurantDoc) {
      console.log("❌ Restaurant not found for ID:", restaurantId);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }

    // ✅ PERMISSION CHECK
    if (req.user && req.user.role !== "admin") {
      const userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      const requestedRestaurantIdStr = restaurantDoc._id.toString();
      const userRestaurantIdStr = userRestaurantId.toString();

      if (userRestaurantIdStr !== requestedRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message:
            "You do not have permission to view orders for this restaurant",
        });
      }
    }

    const filter = { restaurantId: restaurantDoc._id };
    if (status) filter.status = status;

    console.log("📊 Looking for orders with restaurantId:", restaurantDoc._id);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(filter);

    console.log(
      `📊 Found ${orders.length} orders for restaurant ${restaurantDoc.name}`,
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Get orders by restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Public (with tracking)
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.ORDER_NOT_FOUND,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error(`Get order by ID error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

/**
 * @desc    Get order by reference number
 * @route   GET /api/orders/track/:reference
 * @access  Public
 */
exports.getOrderByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    const order = await Order.findOne({ orderReference: reference });

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.ORDER_NOT_FOUND,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error(`Get order by reference error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
};

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Public
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      restaurantName,
      customerName,
      customerPhone,
      customerEmail,
      items,
      pickupTimeOption,
      scheduledTime,
      paymentMethod,
      specialInstructions,
    } = req.body;

    console.log("📝 Creating order with restaurantId:", restaurantId);

    // Validate required fields
    if (
      !restaurantId ||
      !customerName ||
      !customerPhone ||
      !items ||
      items.length === 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Missing required order information",
      });
    }

    // Find the actual restaurant by various identifiers
    let restaurantDoc = null;

    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurantDoc = await Restaurant.findById(restaurantId);
    }

    if (!restaurantDoc) {
      restaurantDoc = await Restaurant.findOne({
        $or: [
          { slug: restaurantId },
          { subdomain: restaurantId },
          { id: restaurantId },
        ],
      });
    }

    if (!restaurantDoc) {
      console.log("❌ Restaurant not found for ID:", restaurantId);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (!restaurantDoc.isActive) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.RESTAURANT_INACTIVE,
      });
    }

    if (restaurantDoc.isOrderingPaused) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.ORDER_PAUSED,
      });
    }

    // Calculate totals
    const taxRate = restaurantDoc.taxesAndFees?.taxRatePercent || 8.5;
    const serviceFee = restaurantDoc.taxesAndFees?.serviceFeeAmount || 2.5;

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const taxAmount = (subtotal * taxRate) / 100;
    const totalPrice = subtotal + taxAmount + serviceFee;

    // Generate order reference
    const orderReference = generateOrderReference();

    // Create order with the restaurant's ObjectId
    const orderData = {
      restaurantId: restaurantDoc._id,
      restaurantName: restaurantName || restaurantDoc.name,
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      items,
      subtotal,
      taxAmount,
      serviceFee,
      totalPrice: Math.round(totalPrice * 100) / 100,
      pickupTimeOption: pickupTimeOption || "ASAP",
      scheduledTime: scheduledTime || null,
      paymentMethod: paymentMethod || "online",
      status: "NEW",
      specialInstructions: specialInstructions || "",
      orderReference,
      // ✅ Payment fields
      paymentStatus: paymentMethod === "online" ? "pending" : "pending",
      paymentAmount: Math.round(totalPrice * 100) / 100,
      paymentCurrency: "usd",
    };

    console.log("📝 Order data to save:", JSON.stringify(orderData, null, 2));

    // Save order first
    const order = await Order.create(orderData);

    console.log("✅ Order created successfully:", order._id);

    // ✅ If payment method is online, create a Stripe payment intent for the restaurant
    let paymentIntentResult = null;
    if (paymentMethod === "online") {
      // Get the restaurant's Stripe account ID
      const restaurantStripeAccountId = restaurantDoc.stripeConnect?.accountId;

      if (!restaurantStripeAccountId) {
        // Delete the order since payment can't be processed
        await Order.findByIdAndDelete(order._id);

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message:
            "Restaurant has not connected their Stripe account yet. Please choose 'Pay at Pickup' or contact the restaurant.",
        });
      }

      // Check if the Stripe account is fully set up
      const isAccountReady =
        restaurantDoc.stripeConnect?.accountStatus === "connected" &&
        restaurantDoc.stripeConnect?.chargesEnabled;

      if (!isAccountReady) {
        // Delete the order
        await Order.findByIdAndDelete(order._id);

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message:
            "Restaurant's Stripe account is not fully set up. Please choose 'Pay at Pickup' or try again later.",
        });
      }

      try {
        // Create payment intent for the restaurant
        paymentIntentResult = await createPaymentIntentForRestaurant(
          totalPrice,
          "usd",
          restaurantStripeAccountId,
          {
            orderId: order._id.toString(),
            orderReference: orderReference,
            restaurantId: restaurantDoc._id.toString(),
            restaurantName: restaurantDoc.name,
            customerEmail: customerEmail || "",
            customerName: customerName,
          },
          customerEmail || null,
          orderReference,
          restaurantDoc.name,
        );

        // Update order with payment intent details
        order.stripePaymentIntentId = paymentIntentResult.paymentIntentId;
        order.stripeClientSecret = paymentIntentResult.clientSecret;
        order.stripePaymentStatus = paymentIntentResult.status;
        order.stripeAccountId = restaurantStripeAccountId;
        await order.save();

        console.log(`✅ Payment intent created for order ${orderReference}`);
        console.log(
          `   → Amount: $${totalPrice} → Restaurant: ${restaurantDoc.name}`,
        );
      } catch (stripeError) {
        // Delete the order if Stripe fails
        await Order.findByIdAndDelete(order._id);

        logger.error(`❌ Stripe payment intent error: ${stripeError.message}`);
        return res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message:
            "Payment processing failed. Please try again or choose 'Pay at Pickup'.",
          error: stripeError.message,
        });
      }
    }

    // Populate the order with restaurant details
    await order.populate("restaurantId", "name");

    // ✅ For pickup payments, send email and broadcast immediately
    if (paymentMethod === "pickup") {
      // Send order confirmation email to customer
      if (order.customerEmail) {
        sendOrderConfirmationEmail(order).catch((err) => {
          logger.error(`❌ Failed to send confirmation email: ${err.message}`);
        });
      }

      // Broadcast new order via SSE
      try {
        const restaurantIdStr = restaurantDoc._id.toString();
        const orderForSSE = order.toObject ? order.toObject() : order;
        broadcastNewOrder(restaurantIdStr, orderForSSE);
        logger.info(
          `📡 SSE: New order broadcasted for restaurant ${restaurantIdStr}`,
        );
      } catch (sseError) {
        logger.error(`❌ SSE broadcast error: ${sseError.message}`);
      }
    }

    // Prepare response
    const responseData = order.toObject ? order.toObject() : order;

    // Add payment client secret for online payments
    if (paymentMethod === "online" && paymentIntentResult) {
      responseData.clientSecret = paymentIntentResult.clientSecret;
      responseData.paymentIntentId = paymentIntentResult.paymentIntentId;
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message:
        paymentMethod === "online"
          ? "Order created. Please complete payment."
          : SUCCESS_MESSAGES.ORDER_CREATED,
      data: responseData,
    });
  } catch (error) {
    logger.error(`Create order error: ${error.message}`);
    console.error("❌ Create order error details:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Restaurant Owner or Admin
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.ORDER_NOT_FOUND,
      });
    }

    // ✅ Check if user has permission to update this order
    if (req.user && req.user.role !== "admin") {
      const userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      const orderRestaurantIdStr = order.restaurantId.toString();
      const userRestaurantIdStr = userRestaurantId.toString();

      if (userRestaurantIdStr !== orderRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message:
            "You do not have permission to update orders for this restaurant",
        });
      }
    }

    // Validate status
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // ✅ Send email notification when order is marked as READY
    if (status === "READY" && previousStatus !== "READY") {
      if (order.customerEmail) {
        sendOrderReadyEmail(order).catch((err) => {
          logger.error(`❌ Failed to send ready email: ${err.message}`);
        });
      }
    }

    // ✅ Broadcast order status update via SSE
    try {
      const restaurantIdStr = order.restaurantId.toString();
      broadcastOrderStatusUpdate(restaurantIdStr, order._id.toString(), status);
      logger.info(`📡 SSE: Status update broadcasted for order ${order._id}`);
    } catch (sseError) {
      logger.error(`❌ SSE status broadcast error: ${sseError.message}`);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.ORDER_UPDATED,
      data: order,
    });
  } catch (error) {
    logger.error(`Update order status error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

/**
 * @desc    Get order statistics for a restaurant
 * @route   GET /api/orders/restaurant/:restaurantId/statistics
 * @access  Restaurant Owner or Admin
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Find the actual restaurant
    let restaurantDoc = null;

    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurantDoc = await Restaurant.findById(restaurantId);
    }

    if (!restaurantDoc) {
      restaurantDoc = await Restaurant.findOne({
        $or: [{ slug: restaurantId }, { subdomain: restaurantId }],
      });
    }

    if (!restaurantDoc) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          counts: {
            total: 0,
            new: 0,
            preparing: 0,
            ready: 0,
            completed: 0,
            byStatus: [],
          },
          sales: { today: 0, week: 0, month: 0 },
          orders: { today: 0, week: 0, month: 0 },
        },
      });
    }

    // ✅ Check if user has permission to view this restaurant's statistics
    if (req.user && req.user.role !== "admin") {
      const userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      const requestedRestaurantIdStr = restaurantDoc._id.toString();
      const userRestaurantIdStr = userRestaurantId.toString();

      if (userRestaurantIdStr !== requestedRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message:
            "You do not have permission to view statistics for this restaurant",
        });
      }
    }

    const actualRestaurantId = restaurantDoc._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Get counts by status
    const statusCounts = await Order.aggregate([
      { $match: { restaurantId: actualRestaurantId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Get today's orders
    const todayOrders = await Order.find({
      restaurantId: actualRestaurantId,
      createdAt: { $gte: today },
    });

    // Get week's orders
    const weekOrders = await Order.find({
      restaurantId: actualRestaurantId,
      createdAt: { $gte: weekAgo },
    });

    // Get month's orders
    const monthOrders = await Order.find({
      restaurantId: actualRestaurantId,
      createdAt: { $gte: monthAgo },
    });

    // Calculate sales
    const calculateSales = (orders) => {
      return orders.reduce((sum, order) => sum + order.totalPrice, 0);
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        counts: {
          total: await Order.countDocuments({
            restaurantId: actualRestaurantId,
          }),
          new: await Order.countDocuments({
            restaurantId: actualRestaurantId,
            status: "NEW",
          }),
          preparing: await Order.countDocuments({
            restaurantId: actualRestaurantId,
            status: "PREPARING",
          }),
          ready: await Order.countDocuments({
            restaurantId: actualRestaurantId,
            status: "READY",
          }),
          completed: await Order.countDocuments({
            restaurantId: actualRestaurantId,
            status: "COMPLETED",
          }),
          byStatus: statusCounts,
        },
        sales: {
          today: calculateSales(todayOrders),
          week: calculateSales(weekOrders),
          month: calculateSales(monthOrders),
        },
        orders: {
          today: todayOrders.length,
          week: weekOrders.length,
          month: monthOrders.length,
        },
      },
    });
  } catch (error) {
    logger.error(`Get order statistics error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch order statistics",
    });
  }
};

/**
 * @desc    Get payment intent status
 * @route   GET /api/orders/payment/:orderId
 * @access  Public
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        paymentStatus: order.paymentStatus,
        stripePaymentStatus: order.stripePaymentStatus,
        stripePaymentIntentId: order.stripePaymentIntentId,
        clientSecret: order.stripeClientSecret,
        stripeAccountId: order.stripeAccountId,
      },
    });
  } catch (error) {
    logger.error(`Get payment status error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to get payment status",
    });
  }
};
