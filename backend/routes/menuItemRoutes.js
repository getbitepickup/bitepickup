const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const menuItemController = require('../controllers/menuItemController');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticate, isAdmin, ownsRestaurant } = require('../middleware/auth');

/**
 * @route   GET /api/menu-items
 * @desc    Get all menu items
 * @access  Public
 */
router.get(
  '/',
  [
    query('restaurantId').optional().isMongoId().withMessage('Invalid restaurant ID'),
    query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
    query('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  ],
  validateRequest,
  menuItemController.getMenuItems
);

/**
 * @route   GET /api/menu-items/restaurant/:restaurantId
 * @desc    Get menu items by restaurant
 * @access  Public
 */
router.get(
  '/restaurant/:restaurantId',
  [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
    query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
    query('includeHidden').optional().isBoolean().withMessage('includeHidden must be a boolean'),
  ],
  validateRequest,
  menuItemController.getMenuItemsByRestaurant
);

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get menu item by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid menu item ID'),
  ],
  validateRequest,
  menuItemController.getMenuItemById
);

/**
 * @route   POST /api/menu-items
 * @desc    Create a menu item
 * @access  Admin or Restaurant Owner
 */
router.post(
  '/',
  authenticate,
  [
    body('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
    body('categoryId').isMongoId().withMessage('Invalid category ID'),
    body('name').notEmpty().withMessage('Item name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    // Make description optional - don't validate it strictly
    body('description').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Description must be a string'),
    body('image').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Image must be a string'),
    body('availability').optional().isIn(['available', 'out_of_stock', 'hidden']).withMessage('Invalid availability status'),
    body('displayOrder').optional().isInt().withMessage('Display order must be an integer'),
  ],
  (req, res, next) => {
    // Ensure description and image are always strings
    if (req.body.description === undefined || req.body.description === null) {
      req.body.description = '';
    }
    if (req.body.image === undefined || req.body.image === null) {
      req.body.image = '';
    }
    // Ensure name and price are present
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required'
      });
    }
    if (req.body.price === undefined || req.body.price === null || req.body.price === '') {
      return res.status(400).json({
        success: false,
        message: 'Price is required'
      });
    }
    next();
  },
  validateRequest,
  ownsRestaurant,
  menuItemController.createMenuItem
);

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update a menu item
 * @access  Admin or Restaurant Owner
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid menu item ID'),
    body('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
    body('name').optional().notEmpty().withMessage('Item name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('description').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Description must be a string'),
    body('image').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Image must be a string'),
    body('availability').optional().isIn(['available', 'out_of_stock', 'hidden']).withMessage('Invalid availability status'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
    body('displayOrder').optional().isInt().withMessage('Display order must be an integer'),
  ],
  validateRequest,
  ownsRestaurant,
  menuItemController.updateMenuItem
);

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete a menu item
 * @access  Admin or Restaurant Owner
 */
router.delete(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid menu item ID'),
  ],
  validateRequest,
  ownsRestaurant,
  menuItemController.deleteMenuItem
);

module.exports = router;