const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const restaurantController = require('../controllers/restaurantController');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticate, isAdmin, ownsRestaurant } = require('../middleware/auth');

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants with optional filtering
 * @access  Public/Admin
 */
router.get(
  '/',
  [
    query('active').optional().isBoolean().withMessage('Active must be a boolean'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  ],
  validateRequest,
  restaurantController.getRestaurants
);

/**
 * @route   GET /api/restaurants/active
 * @desc    Get all active restaurants
 * @access  Public
 */
router.get('/active', restaurantController.getActiveRestaurants);

/**
 * @route   GET /api/restaurants/by-subdomain/:subdomain
 * @desc    Get restaurant by subdomain
 * @access  Public
 */
router.get(
  '/by-subdomain/:subdomain',
  [
    param('subdomain').notEmpty().withMessage('Subdomain is required'),
  ],
  validateRequest,
  restaurantController.getRestaurantBySubdomain
);

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get restaurant by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  restaurantController.getRestaurantById
);

/**
 * @route   POST /api/restaurants
 * @desc    Create a new restaurant
 * @access  Admin only
 */
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('name').notEmpty().withMessage('Restaurant name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
    body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
    body('ownerEmail').isEmail().withMessage('Valid owner email is required'),
    body('ownerPassword').isLength({ min: 6 }).withMessage('Owner password must be at least 6 characters'),
    body('ownerFirstName').notEmpty().withMessage('Owner first name is required'),
    body('ownerLastName').notEmpty().withMessage('Owner last name is required'),
    body('ownerPhone').notEmpty().withMessage('Owner phone is required'),
  ],
  validateRequest,
  restaurantController.createRestaurant
);

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update a restaurant
 * @access  Admin or Restaurant Owner
 */
router.put(
  '/:id',
  authenticate,
  ownsRestaurant,
  [
    param('id').isMongoId().withMessage('Invalid restaurant ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional(),
    body('phone').optional(),
    body('address').optional(),
    body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
    body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('isOrderingPaused').optional().isBoolean().withMessage('isOrderingPaused must be a boolean'),
  ],
  validateRequest,
  restaurantController.updateRestaurant
);

/**
 * @route   DELETE /api/restaurants/:id
 * @desc    Delete a restaurant (cascades to categories and menu items)
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    param('id').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  restaurantController.deleteRestaurant
);

/**
 * @route   PUT /api/restaurants/:id/toggle-active
 * @desc    Toggle restaurant active status
 * @access  Admin or Restaurant Owner
 */
router.put(
  '/:id/toggle-active',
  authenticate,
  ownsRestaurant,
  [
    param('id').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  restaurantController.toggleRestaurantActive
);

module.exports = router;