const express = require("express");
const router = express.Router();
const { handleWebhook } = require("../controllers/webhookController");

/**
 * Stripe webhook endpoint
 * This route must be raw body to verify signatures
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

module.exports = router;
