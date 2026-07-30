const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const orderController = require("../controllers/orderController");
const { validateRequest } = require("../middleware/validateRequest");
const {
  authenticate,
  isAdmin,
  isRestaurantOwner,
} = require("../middleware/auth");

/**
 * @route   GET /api/orders
 * @desc    Get all orders (with permission check inside controller)
 * @access  Admin or Restaurant Owner
 */
router.get(
  "/",
  authenticate,
  [
    query("restaurantId").optional(),
    query("status")
      .optional()
      .isIn(["NEW", "PREPARING", "READY", "COMPLETED"])
      .withMessage("Invalid status"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be at least 1"),
  ],
  validateRequest,
  orderController.getOrders,
);

/**
 * @route   GET /api/orders/restaurant/:restaurantId
 * @desc    Get orders by restaurant
 * @access  Restaurant Owner or Admin
 */
router.get(
  "/restaurant/:restaurantId",
  authenticate,
  [
    param("restaurantId").isMongoId().withMessage("Invalid restaurant ID"),
    query("status")
      .optional()
      .isIn(["NEW", "PREPARING", "READY", "COMPLETED"])
      .withMessage("Invalid status"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be at least 1"),
  ],
  validateRequest,
  orderController.getOrdersByRestaurant,
);

/**
 * @route   GET /api/orders/track/:reference
 * @desc    Get order by reference number
 * @access  Public
 */
router.get(
  "/track/:reference",
  [param("reference").notEmpty().withMessage("Reference is required")],
  validateRequest,
  orderController.getOrderByReference,
);

/**
 * @route   GET /api/orders/payment/:orderId
 * @desc    Get payment status
 * @access  Public
 */
router.get(
  "/payment/:orderId",
  [param("orderId").isMongoId().withMessage("Invalid order ID")],
  validateRequest,
  orderController.getPaymentStatus,
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Public
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid order ID")],
  validateRequest,
  orderController.getOrderById,
);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Public
 */
router.post(
  "/",
  [
    body("restaurantId").notEmpty().withMessage("Restaurant ID is required"),
    body("customerName").notEmpty().withMessage("Customer name is required"),
    body("customerPhone").notEmpty().withMessage("Customer phone is required"),
    body("customerEmail")
      .isEmail()
      .withMessage("Valid customer email is required"),
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
    body("pickupTimeOption")
      .optional()
      .isIn(["ASAP", "scheduled"])
      .withMessage("Invalid pickup time option"),
    body("paymentMethod")
      .optional()
      .isIn(["online", "pickup"])
      .withMessage("Invalid payment method"),
  ],
  validateRequest,
  orderController.createOrder,
);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Restaurant Owner or Admin
 */
router.put(
  "/:id/status",
  authenticate,
  [
    param("id").isMongoId().withMessage("Invalid order ID"),
    body("status")
      .isIn(["NEW", "PREPARING", "READY", "COMPLETED"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  orderController.updateOrderStatus,
);

/**
 * @route   GET /api/orders/restaurant/:restaurantId/statistics
 * @desc    Get order statistics
 * @access  Restaurant Owner or Admin
 */
router.get(
  "/restaurant/:restaurantId/statistics",
  authenticate,
  [param("restaurantId").isMongoId().withMessage("Invalid restaurant ID")],
  validateRequest,
  orderController.getOrderStatistics,
);

module.exports = router;
