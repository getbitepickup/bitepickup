const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { generateOrderReference, calculateOrderTotals } = require('../utils/helpers');
const { ORDER_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Service for order-related business logic
 */

/**
 * Create a new order with validation
 */
const createOrder = async (orderData) => {
  const {
    restaurantId,
    customerName,
    customerPhone,
    customerEmail,
    items,
    pickupTimeOption,
    scheduledTime,
    paymentMethod,
    specialInstructions,
  } = orderData;

  // Validate restaurant
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw new Error('Restaurant is not active');
  }

  if (restaurant.isOrderingPaused) {
    throw new Error('Restaurant is currently not accepting orders');
  }

  // Calculate totals
  const taxRate = restaurant.taxesAndFees?.taxRatePercent || 8.5;
  const serviceFee = restaurant.taxesAndFees?.serviceFeeAmount || 2.50;
  
  const { subtotal, taxAmount, total } = calculateOrderTotals(items, taxRate, serviceFee);

  // Generate order reference
  const orderReference = generateOrderReference();

  // Create order
  const order = await Order.create({
    restaurantId,
    restaurantName: restaurant.name,
    customerName,
    customerPhone,
    customerEmail: customerEmail || '',
    items,
    subtotal,
    taxAmount,
    serviceFee,
    totalPrice: total,
    pickupTimeOption: pickupTimeOption || 'ASAP',
    scheduledTime: scheduledTime || null,
    paymentMethod: paymentMethod || 'online',
    status: 'NEW',
    specialInstructions: specialInstructions || '',
    orderReference,
  });

  return order;
};

/**
 * Update order status with validation
 */
const updateOrderStatus = async (orderId, newStatus) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Status transition validation
  const statusOrder = ['NEW', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(order.status);
  const newIndex = statusOrder.indexOf(newStatus);

  // Allow going forward only (or admin override)
  if (newIndex < currentIndex) {
    throw new Error('Cannot move order to previous status');
  }

  order.status = newStatus;
  order.updatedAt = new Date();
  await order.save();

  return order;
};

/**
 * Get order statistics for a restaurant
 */
const getOrderStatistics = async (restaurantId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [totalOrders, statusCounts, todayOrders, weekOrders, monthOrders] = await Promise.all([
    Order.countDocuments({ restaurantId }),
    Order.aggregate([
      { $match: { restaurantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Order.find({ restaurantId, createdAt: { $gte: today } }),
    Order.find({ restaurantId, createdAt: { $gte: weekAgo } }),
    Order.find({ restaurantId, createdAt: { $gte: monthAgo } }),
  ]);

  const calculateSales = (orders) => {
    return orders.reduce((sum, order) => sum + order.totalPrice, 0);
  };

  return {
    total: totalOrders,
    byStatus: statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
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
  };
};

/**
 * Get active orders for a restaurant
 */
const getActiveOrders = async (restaurantId) => {
  const activeStatuses = ['NEW', 'PREPARING', 'READY'];
  return Order.find({
    restaurantId,
    status: { $in: activeStatuses },
  }).sort({ createdAt: -1 });
};

/**
 * Get order by reference for tracking
 */
const getOrderByReference = async (reference) => {
  const order = await Order.findOne({ orderReference: reference });
  if (!order) {
    throw new Error('Order not found');
  }
  return order;
};

module.exports = {
  createOrder,
  updateOrderStatus,
  getOrderStatistics,
  getActiveOrders,
  getOrderByReference,
};