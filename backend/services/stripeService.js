const Stripe = require("stripe");
const logger = require("../utils/logger");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Create a payment intent for an order
 * @param {Object} order - The order object
 * @param {Object} restaurant - The restaurant object
 * @returns {Object} - Payment intent object
 */
const createPaymentIntent = async (order, restaurant) => {
  try {
    // Calculate the amount in cents (Stripe uses smallest currency unit)
    const amount = Math.round(order.totalPrice * 100);
    const currency = "usd";

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      metadata: {
        orderId: order._id.toString(),
        orderReference: order.orderReference,
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.name,
        customerEmail: order.customerEmail || "",
        customerName: order.customerName,
      },
      receipt_email: order.customerEmail || undefined,
      description: `Order #${order.orderReference} - ${restaurant.name}`,
      // Add statement descriptor (shows on customer's bank statement)
      statement_descriptor: `${restaurant.name.slice(0, 22)}`,
    });

    logger.info(
      `✅ Payment intent created for order ${order.orderReference}: ${paymentIntent.id}`,
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error) {
    logger.error(`❌ Failed to create payment intent: ${error.message}`);
    throw error;
  }
};

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Object} - Payment intent object
 */
const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error(`❌ Failed to retrieve payment intent: ${error.message}`);
    throw error;
  }
};

/**
 * Cancel a payment intent
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {Object} - Cancelled payment intent
 */
const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    logger.info(`✅ Payment intent cancelled: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`❌ Failed to cancel payment intent: ${error.message}`);
    throw error;
  }
};

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event
 * @param {Object} Order - Mongoose Order model
 * @param {Function} sendOrderConfirmationEmail - Email function
 * @param {Function} broadcastNewOrder - SSE broadcast function
 * @returns {Object} - Result of processing
 */
const handleWebhookEvent = async (
  event,
  Order,
  sendOrderConfirmationEmail,
  broadcastNewOrder,
) => {
  const { type, data } = event;

  switch (type) {
    case "payment_intent.succeeded": {
      const paymentIntent = data.object;
      const orderId = paymentIntent.metadata.orderId;

      if (!orderId) {
        logger.warn("⚠️ No orderId in payment intent metadata");
        return { success: false, message: "No orderId in metadata" };
      }

      // Find and update the order
      const order = await Order.findById(orderId);
      if (!order) {
        logger.warn(`⚠️ Order not found: ${orderId}`);
        return { success: false, message: "Order not found" };
      }

      // Update order with payment status
      order.paymentStatus = "paid";
      order.stripePaymentStatus = paymentIntent.status;
      order.stripePaymentIntentId = paymentIntent.id;
      order.paymentAmount = paymentIntent.amount / 100;
      order.paymentCurrency = paymentIntent.currency;
      await order.save();

      logger.info(`✅ Payment succeeded for order ${order.orderReference}`);

      // Send email confirmation
      if (order.customerEmail) {
        try {
          // Need to populate restaurant for email
          const Restaurant = require("../models/Restaurant");
          const restaurant = await Restaurant.findById(order.restaurantId);
          if (restaurant) {
            // The email service uses the order and restaurant objects
            // We need to pass the restaurant to the email function
            // This assumes the email service can handle the restaurant parameter
            // If not, we need to adapt the email service
            const {
              sendOrderConfirmationEmail: sendEmail,
            } = require("./emailService");
            await sendEmail(order);
          }
        } catch (emailError) {
          logger.error(
            `❌ Failed to send confirmation email: ${emailError.message}`,
          );
        }
      }

      // Broadcast new order via SSE
      if (broadcastNewOrder) {
        try {
          const restaurantIdStr = order.restaurantId.toString();
          const orderForSSE = order.toObject ? order.toObject() : order;
          broadcastNewOrder(restaurantIdStr, orderForSSE);
          logger.info(
            `📡 SSE: New order broadcasted for restaurant ${restaurantIdStr}`,
          );
        } catch (sseError) {
          logger.error(`❌ SSE broadcast error: ${sseError.message}`);
        }
      }

      return { success: true, order, paymentIntent };
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = data.object;
      const orderId = paymentIntent.metadata.orderId;

      if (!orderId) {
        logger.warn("⚠️ No orderId in payment intent metadata");
        return { success: false, message: "No orderId in metadata" };
      }

      const order = await Order.findById(orderId);
      if (!order) {
        logger.warn(`⚠️ Order not found: ${orderId}`);
        return { success: false, message: "Order not found" };
      }

      // Update order with payment failure
      order.paymentStatus = "failed";
      order.stripePaymentStatus = paymentIntent.status;
      order.stripePaymentIntentId = paymentIntent.id;
      await order.save();

      logger.warn(
        `⚠️ Payment failed for order ${order.orderReference}: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
      );

      return { success: true, order, paymentIntent };
    }

    default:
      logger.info(`ℹ️ Unhandled webhook event: ${type}`);
      return { success: true, message: `Unhandled event type: ${type}` };
  }
};

module.exports = {
  stripe,
  createPaymentIntent,
  retrievePaymentIntent,
  cancelPaymentIntent,
  handleWebhookEvent,
};
