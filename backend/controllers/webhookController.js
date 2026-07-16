const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const logger = require("../utils/logger");
const { sendOrderConfirmationEmail } = require("../services/emailService");
const { broadcastNewOrder } = require("./sseController");
const {
  handleConnectWebhookEvent,
} = require("../services/stripeConnectService");

/**
 * Handle Stripe webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("❌ STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    logger.info(`✅ Webhook verified: ${event.type}`);
  } catch (err) {
    logger.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Process the event using Connect service
  try {
    const result = await handleConnectWebhookEvent(
      event,
      Order,
      Restaurant,
      sendOrderConfirmationEmail,
      broadcastNewOrder,
    );

    if (result.success) {
      return res.status(200).json({ received: true, type: event.type });
    } else {
      return res.status(200).json({
        received: true,
        type: event.type,
        processed: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error(`❌ Webhook processing error: ${error.message}`);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};
