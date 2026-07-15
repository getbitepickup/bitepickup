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
    };

    console.log("📝 Order data to save:", JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    console.log("✅ Order created successfully:", order._id);

    // Populate the order with restaurant details
    await order.populate("restaurantId", "name");

    // ✅ Send order confirmation email to customer (async - don't await to not block response)
    if (order.customerEmail) {
      sendOrderConfirmationEmail(order).catch((err) => {
        logger.error(`❌ Failed to send confirmation email: ${err.message}`);
      });
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.ORDER_CREATED,
      data: order,
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
