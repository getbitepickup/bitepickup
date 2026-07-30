const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const menuItemController = require("../controllers/menuItemController");
const { validateRequest } = require("../middleware/validateRequest");
const { authenticate, isAdmin } = require("../middleware/auth");

/**
 * @route   GET /api/menu-items
 * @desc    Get all menu items (with optional filters)
 * @access  Public
 */
router.get(
  "/",
  [
    query("restaurantId")
      .optional()
      .isMongoId()
      .withMessage("Invalid restaurant ID"),
    query("categoryId")
      .optional()
      .isMongoId()
      .withMessage("Invalid category ID"),
    query("includeHidden")
      .optional()
      .isBoolean()
      .withMessage("includeHidden must be a boolean"),
  ],
  validateRequest,
  menuItemController.getMenuItems,
);

/**
 * @route   GET /api/menu-items/restaurant/:restaurantId
 * @desc    Get menu items by restaurant
 * @access  Public
 */
router.get(
  "/restaurant/:restaurantId",
  [
    param("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    query("includeHidden")
      .optional()
      .isBoolean()
      .withMessage("includeHidden must be a boolean"),
  ],
  validateRequest,
  menuItemController.getMenuItemsByRestaurant,
);

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get menu item by ID
 * @access  Public
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid menu item ID")],
  validateRequest,
  menuItemController.getMenuItemById,
);

/**
 * @route   POST /api/menu-items
 * @desc    Create a new menu item
 * @access  Admin or Restaurant Owner
 */
router.post(
  "/",
  authenticate,
  [
    body("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    body("categoryId").isMongoId().withMessage("Invalid category ID"),
    body("name").notEmpty().withMessage("Menu item name is required"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("description").optional(),
    body("image").optional().isURL().withMessage("Image must be a valid URL"),
    body("isAvailable")
      .optional()
      .isBoolean()
      .withMessage("isAvailable must be a boolean"),
    body("availability")
      .optional()
      .isIn(["available", "out_of_stock", "hidden"])
      .withMessage("Invalid availability status"),
  ],
  validateRequest,
  menuItemController.createMenuItem,
);

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update a menu item
 * @access  Admin or Restaurant Owner
 */
router.put(
  "/:id",
  authenticate,
  [
    param("id").isMongoId().withMessage("Invalid menu item ID"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("description").optional(),
    body("image").optional().isURL().withMessage("Image must be a valid URL"),
    body("categoryId")
      .optional()
      .isMongoId()
      .withMessage("Invalid category ID"),
    body("isAvailable")
      .optional()
      .isBoolean()
      .withMessage("isAvailable must be a boolean"),
    body("availability")
      .optional()
      .isIn(["available", "out_of_stock", "hidden"])
      .withMessage("Invalid availability status"),
  ],
  validateRequest,
  menuItemController.updateMenuItem,
);

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Delete a menu item
 * @access  Admin or Restaurant Owner
 */
router.delete(
  "/:id",
  authenticate, // ✅ ONLY authenticate - permission check is inside deleteMenuItem
  [param("id").isMongoId().withMessage("Invalid menu item ID")],
  validateRequest,
  menuItemController.deleteMenuItem,
);

module.exports = router;
