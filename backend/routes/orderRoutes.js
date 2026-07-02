const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const orderController = require('../controllers/orderController');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticate, isAdmin, ownsRestaurant } = require('../middleware/auth');

/**
 * @route   GET /api/orders
 * @desc    Get all orders
 * @access  Admin only
 */
router.get(
  '/',
  authenticate,
  isAdmin,
  [
    query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
    query('status').optional().isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  ],
  validateRequest,
  orderController.getOrders
);

/**
 * @route   GET /api/orders/restaurant/:restaurantId
 * @desc    Get orders by restaurant
 * @access  Restaurant Owner or Admin
 */
router.get(
  '/restaurant/:restaurantId',
  authenticate,
  [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
    query('status').optional().isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  ],
  validateRequest,
  ownsRestaurant,
  orderController.getOrdersByRestaurant
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
  ],
  validateRequest,
  orderController.getOrderById
);

/**
 * @route   GET /api/orders/track/:reference
 * @desc    Track order by reference
 * @access  Public
 */
router.get(
  '/track/:reference',
  [
    param('reference').notEmpty().withMessage('Order reference is required'),
  ],
  validateRequest,
  orderController.getOrderByReference
);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public
 */
router.post(
  '/',
  [
    body('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerPhone').notEmpty().withMessage('Customer phone is required'),
    body('customerEmail').optional().isEmail().withMessage('Invalid email address'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').notEmpty().withMessage('Item ID is required'),
    body('items.*.name').notEmpty().withMessage('Item name is required'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
    body('pickupTimeOption').optional().isIn(['ASAP', 'scheduled']).withMessage('Invalid pickup option'),
    body('paymentMethod').optional().isIn(['online', 'pickup']).withMessage('Invalid payment method'),
    body('specialInstructions').optional().isString().trim(),
  ],
  validateRequest,
  orderController.createOrder
);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Restaurant Owner or Admin
 */
router.put(
  '/:id/status',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status').isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED']).withMessage('Invalid status'),
  ],
  validateRequest,
  orderController.updateOrderStatus
);

/**
 * @route   GET /api/orders/restaurant/:restaurantId/statistics
 * @desc    Get order statistics
 * @access  Restaurant Owner or Admin
 */
router.get(
  '/restaurant/:restaurantId/statistics',
  authenticate,
  [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  ownsRestaurant,
  orderController.getOrderStatistics
);

module.exports = router;