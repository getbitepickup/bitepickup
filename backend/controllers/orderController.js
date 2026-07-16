const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
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
 * @desc    Get all orders
 * @route   GET /api/orders
 * @access  Admin only
 */
exports.getOrders = async (req, res) => {
  try {
    const { restaurantId, status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};

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
      } else {
        filter.restaurantId = restaurantId;
      }
    }

    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(filter);

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
