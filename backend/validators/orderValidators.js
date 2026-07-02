const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating an order
 */
const createOrderValidation = [
  body('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('customerPhone')
    .notEmpty()
    .withMessage('Customer phone is required')
    .trim(),
  
  body('customerEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.menuItemId')
    .notEmpty()
    .withMessage('Item ID is required'),
  
  body('items.*.name')
    .notEmpty()
    .withMessage('Item name is required')
    .trim(),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a positive number'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  
  body('pickupTimeOption')
    .optional()
    .isIn(['ASAP', 'scheduled'])
    .withMessage('Invalid pickup option'),
  
  body('scheduledTime')
    .optional()
    .isString()
    .trim(),
  
  body('paymentMethod')
    .optional()
    .isIn(['online', 'pickup'])
    .withMessage('Invalid payment method'),
  
  body('specialInstructions')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions cannot exceed 500 characters'),
];

/**
 * Validation rules for updating order status
 */
const updateOrderStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
  
  body('status')
    .isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED'])
    .withMessage('Invalid status. Must be: NEW, PREPARING, READY, or COMPLETED'),
];

/**
 * Validation rules for getting orders
 */
const getOrdersValidation = [
  query('restaurantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  query('status')
    .optional()
    .isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED'])
    .withMessage('Invalid status'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
];

/**
 * Validation rules for getting orders by restaurant
 */
const getOrdersByRestaurantValidation = [
  param('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  query('status')
    .optional()
    .isIn(['NEW', 'PREPARING', 'READY', 'COMPLETED'])
    .withMessage('Invalid status'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
];

/**
 * Validation rules for order ID param
 */
const orderIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

/**
 * Validation rules for restaurant ID param
 */
const restaurantIdParamValidation = [
  param('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
];

/**
 * Validation rules for order reference
 */
const orderReferenceValidation = [
  param('reference')
    .notEmpty()
    .withMessage('Order reference is required')
    .trim(),
];

module.exports = {
  createOrderValidation,
  updateOrderStatusValidation,
  getOrdersValidation,
  getOrdersByRestaurantValidation,
  orderIdValidation,
  restaurantIdParamValidation,
  orderReferenceValidation,
};