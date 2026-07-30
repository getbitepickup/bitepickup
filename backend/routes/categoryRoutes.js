const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const categoryController = require("../controllers/categoryController");
const { validateRequest } = require("../middleware/validateRequest");
const { authenticate, isAdmin } = require("../middleware/auth");

/**
 * @route   GET /api/categories
 * @desc    Get all categories (with optional restaurant filter)
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
  [param("restaurantId").isMongoId().withMessage("Invalid restaurant ID")],
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
 * @desc    Create a new category
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
      .isInt({ min: 0 })
      .withMessage("Display order must be a positive integer"),
  ],
  validateRequest,
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
      .isInt({ min: 0 })
      .withMessage("Display order must be a positive integer"),
  ],
  validateRequest,
  categoryController.updateCategory,
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (cascades to menu items)
 * @access  Admin or Restaurant Owner
 */
router.delete(
  "/:id",
  authenticate, // ✅ ONLY authenticate - permission check is inside deleteCategory
  [param("id").isMongoId().withMessage("Invalid category ID")],
  validateRequest,
  categoryController.deleteCategory,
);

/**
 * @route   PUT /api/categories/sort-order/:restaurantId
 * @desc    Update category sort order for a restaurant
 * @access  Restaurant Owner or Admin
 */
router.put(
  "/sort-order/:restaurantId",
  authenticate,
  [
    param("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    body("sortOrder")
      .isIn(["created", "alphabetical_asc", "alphabetical_desc"])
      .withMessage("Invalid sort order"),
  ],
  validateRequest,
  categoryController.updateCategorySortOrder,
);

/**
 * @route   GET /api/categories/sort-order/:restaurantId
 * @desc    Get category sort order for a restaurant
 * @access  Public
 */
router.get(
  "/sort-order/:restaurantId",
  [param("restaurantId").isMongoId().withMessage("Invalid restaurant ID")],
  validateRequest,
  categoryController.getCategorySortOrder,
);

module.exports = router;
