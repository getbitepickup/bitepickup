const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const settingsController = require("../controllers/settingsController");
const { validateRequest } = require("../middleware/validateRequest");
const { authenticate } = require("../middleware/auth");

/**
 * @route   GET /api/settings/restaurant/:restaurantId
 * @desc    Get restaurant settings
 * @access  Restaurant Owner or Admin
 */
router.get(
  "/restaurant/:restaurantId",
  authenticate, // ✅ ONLY authenticate - permission check is inside controller
  [param("restaurantId").isMongoId().withMessage("Invalid restaurant ID")],
  validateRequest,
  settingsController.getRestaurantSettings,
);

/**
 * @route   PUT /api/settings/restaurant/:restaurantId
 * @desc    Update restaurant settings
 * @access  Restaurant Owner or Admin
 */
router.put(
  "/restaurant/:restaurantId",
  authenticate, // ✅ ONLY authenticate - permission check is inside controller
  [
    param("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    body("businessHours")
      .optional()
      .isObject()
      .withMessage("Business hours must be an object"),
    body("pickupSettings")
      .optional()
      .isObject()
      .withMessage("Pickup settings must be an object"),
    body("taxesAndFees")
      .optional()
      .isObject()
      .withMessage("Taxes and fees must be an object"),
    body("isOrderingPaused")
      .optional()
      .isBoolean()
      .withMessage("isOrderingPaused must be a boolean"),
  ],
  validateRequest,
  settingsController.updateRestaurantSettings,
);

/**
 * @route   PUT /api/settings/restaurant/:restaurantId/toggle-pause
 * @desc    Toggle ordering pause
 * @access  Restaurant Owner or Admin
 */
router.put(
  "/restaurant/:restaurantId/toggle-pause",
  authenticate, // ✅ ONLY authenticate - permission check is inside controller
  [param("restaurantId").isMongoId().withMessage("Invalid restaurant ID")],
  validateRequest,
  settingsController.toggleOrderingPause,
);

module.exports = router;
