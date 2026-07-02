const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a menu item
 */
const createMenuItemValidation = [
  body('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  body('categoryId')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('name')
    .notEmpty()
    .withMessage('Item name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('availability')
    .optional()
    .isIn(['available', 'out_of_stock', 'hidden'])
    .withMessage('Invalid availability status'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer'),
];

/**
 * Validation rules for updating a menu item
 */
const updateMenuItemValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID'),
  
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Item name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('availability')
    .optional()
    .isIn(['available', 'out_of_stock', 'hidden'])
    .withMessage('Invalid availability status'),
  
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer'),
];

/**
 * Validation rules for getting menu items
 */
const getMenuItemsValidation = [
  query('restaurantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
];

/**
 * Validation rules for getting menu items by restaurant
 */
const getMenuItemsByRestaurantValidation = [
  param('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  query('includeHidden')
    .optional()
    .isBoolean()
    .withMessage('includeHidden must be a boolean'),
];

/**
 * Validation rules for menu item ID param
 */
const menuItemIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid menu item ID'),
];

module.exports = {
  createMenuItemValidation,
  updateMenuItemValidation,
  getMenuItemsValidation,
  getMenuItemsByRestaurantValidation,
  menuItemIdValidation,
};