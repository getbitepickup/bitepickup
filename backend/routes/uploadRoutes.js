const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const uploadController = require('../controllers/uploadController');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateRequest } = require('../middleware/validateRequest');
const { authenticate, ownsRestaurant, isAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/upload/restaurant/:restaurantId/logo
 * @desc    Upload restaurant logo
 * @access  Admin or Restaurant Owner
 */
router.post(
  '/restaurant/:restaurantId/logo',
  authenticate,
  upload.single('image'),
  handleUploadError,
  [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  ownsRestaurant,
  uploadController.uploadRestaurantLogo
);

/**
 * @route   POST /api/upload/restaurant/:restaurantId/cover
 * @desc    Upload restaurant cover image
 * @access  Admin or Restaurant Owner
 */
router.post(
  '/restaurant/:restaurantId/cover',
  authenticate,
  upload.single('image'),
  handleUploadError,
  [
    param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
  ],
  validateRequest,
  ownsRestaurant,
  uploadController.uploadRestaurantCover
);

/**
 * @route   POST /api/upload/menu-item/:menuItemId
 * @desc    Upload menu item image
 * @access  Admin or Restaurant Owner
 */
router.post(
  '/menu-item/:menuItemId',
  authenticate,
  upload.single('image'),
  handleUploadError,
  [
    param('menuItemId').isMongoId().withMessage('Invalid menu item ID'),
  ],
  validateRequest,
  ownsRestaurant,
  uploadController.uploadMenuItemImage
);

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete uploaded image
 * @access  Admin or Restaurant Owner
 */
router.delete(
  '/:publicId',
  authenticate,
  uploadController.deleteImage
);

module.exports = router;