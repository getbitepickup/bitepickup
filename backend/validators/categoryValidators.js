const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a category
 */
const createCategoryValidation = [
  body('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
  
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer'),
];

/**
 * Validation rules for updating a category
 */
const updateCategoryValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer'),
];

/**
 * Validation rules for getting categories
 */
const getCategoriesValidation = [
  query('restaurantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
];

/**
 * Validation rules for category ID param
 */
const categoryIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category ID'),
];

/**
 * Validation rules for restaurant ID param
 */
const restaurantIdParamValidation = [
  param('restaurantId')
    .isMongoId()
    .withMessage('Invalid restaurant ID'),
];

module.exports = {
  createCategoryValidation,
  updateCategoryValidation,
  getCategoriesValidation,
  categoryIdValidation,
  restaurantIdParamValidation,
};