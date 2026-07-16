const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripeController");
const { protect } = require("../middleware/auth");

/**
 * Stripe Connect Routes
 * All routes require authentication
 */

// Get OAuth link for restaurant
router.get("/connect/:restaurantId", protect, stripeController.getConnectLink);

// Get account status
router.get("/status/:restaurantId", protect, stripeController.getAccountStatus);

// OAuth callback (public - no auth required)
router.get("/oauth/callback", stripeController.oauthCallback);

// Disconnect account
router.delete(
  "/disconnect/:restaurantId",
  protect,
  stripeController.disconnectAccount,
);

module.exports = router;
