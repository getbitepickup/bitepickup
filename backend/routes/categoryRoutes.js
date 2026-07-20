const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const categoryController = require("../controllers/categoryController");
const { validateRequest } = require("../middleware/validateRequest");
const { authenticate, isAdmin, ownsRestaurant } = require("../middleware/auth");

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get(
  "/",
  [
    query("restaurantId")
      .optional()
      .isMongoId()
      .withMessage("Invalid restaurant ID"),
  ],
  validateRequest,
  categoryController.getCategories,
);

/**
 * @route   GET /api/categories/restaurant/:restaurantId
 * @desc    Get categories by restaurant
 * @access  Public
 */
router.get(
  "/restaurant/:restaurantId",
  [param("restaurantId").notEmpty().withMessage("Restaurant ID is required")],
  validateRequest,
  categoryController.getCategoriesByRestaurant,
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid category ID")],
  validateRequest,
  categoryController.getCategoryById,
);

/**
 * @route   POST /api/categories
 * @desc    Create a category
 * @access  Admin or Restaurant Owner
 */
router.post(
  "/",
  authenticate,
  [
    body("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    body("name").notEmpty().withMessage("Category name is required"),
    body("displayOrder")
      .optional()
      .isInt()
      .withMessage("Display order must be an integer"),
  ],
  validateRequest,
  ownsRestaurant,
  categoryController.createCategory,
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Admin or Restaurant Owner
 */
router.put(
  "/:id",
  authenticate,
  [
    param("id").isMongoId().withMessage("Invalid category ID"),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Category name cannot be empty"),
    body("displayOrder")
      .optional()
      .isInt()
      .withMessage("Display order must be an integer"),
  ],
  validateRequest,
  ownsRestaurant,
  categoryController.updateCategory,
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (cascades to menu items)
 * @access  Admin or Restaurant Owner
 */
router.delete(
  "/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid category ID")],
  validateRequest,
  ownsRestaurant,
  categoryController.deleteCategory,
);

// ✅ NEW: Update category sort order for a restaurant
router.put(
  "/sort-order/:restaurantId",
  authenticate,
  [
    param("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    body("sortOrder")
      .isIn(["created", "alphabetical_asc", "alphabetical_desc"])
      .withMessage(
        "Invalid sort order. Must be: created, alphabetical_asc, or alphabetical_desc",
      ),
  ],
  validateRequest,
  ownsRestaurant,
  categoryController.updateCategorySortOrder,
);

// ✅ NEW: Get category sort order for a restaurant
router.get(
  "/sort-order/:restaurantId",
  [param("restaurantId").notEmpty().withMessage("Restaurant ID is required")],
  validateRequest,
  categoryController.getCategorySortOrder,
);

module.exports = router;
