const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticate, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Admin only
 */
router.get(
  '/',
  authenticate,
  isAdmin,
  [
    query('role').optional().isIn(['admin', 'restaurant_owner', 'customer']).withMessage('Invalid role'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  ],
  validateRequest,
  userController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin or Self
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  validateRequest,
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin or Self
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('role').optional().isIn(['admin', 'restaurant_owner', 'customer']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  validateRequest,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  validateRequest,
  userController.deleteUser
);

module.exports = router;