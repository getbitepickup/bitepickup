const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a restaurant
 */
const createRestaurantValidation = [
  body('name')
    .notEmpty()
    .withMessage('Restaurant name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Restaurant name must be between 2 and 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim(),
  
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('logo')
    .optional()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  
  body('coverImage')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
];

/**
 * Validation rules for updating a restaurant
 */
const updateRestaurantValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Restaurant name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Restaurant name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('phone')
    .optional()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .trim(),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('logo')
    .optional()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  
  body('coverImage')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('isOrderingPaused')
    .optional()
    .isBoolean()
    .withMessage('isOrderingPaused must be a boolean'),
  
  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object'),
  
  body('pickupSettings')
    .optional()
    .isObject()
    .withMessage('Pickup settings must be an object'),
  
  body('taxesAndFees')
    .optional()
    .isObject()
    .withMessage('Taxes and fees must be an object'),
];

/**
 * Validation rules for getting restaurants
 */
const getRestaurantsValidation = [
  query('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),
  
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
 * Validation rules for restaurant ID param
 */
const restaurantIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
];

/**
 * Validation rules for subdomain param
 */
const subdomainValidation = [
  param('subdomain')
    .notEmpty()
    .withMessage('Subdomain is required')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Subdomain must be at least 3 characters'),
];

module.exports = {
  createRestaurantValidation,
  updateRestaurantValidation,
  getRestaurantsValidation,
  restaurantIdValidation,
  subdomainValidation,
};