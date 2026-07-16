const Stripe = require("stripe");
const logger = require("../utils/logger");

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Generate OAuth link for restaurant to connect their Stripe account
 * @param {string} restaurantId - The restaurant ID
 * @param {string} restaurantName - The restaurant name
 * @param {string} email - Contact email
 * @returns {Object} - OAuth link and account ID
 */
const generateConnectLink = async (restaurantId, restaurantName, email) => {
  try {
    // Create a Stripe Connect account for the restaurant
    const account = await stripe.accounts.create({
      type: "standard",
      country: "US",
      email: email || process.env.CONTACT_EMAIL || "orders@hinarok.com",
      business_profile: {
        name: restaurantName || "Hinarok Restaurant",
        url: `https://hinarok.com/restaurant/${restaurantId}`,
        mcc: "5812", // Eating places and restaurants
      },
      business_type: "company",
      company: {
        name: restaurantName || "Hinarok Restaurant",
      },
      tos_acceptance: {
        service_agreement: "recipient",
      },
    });

    logger.info(
      `✅ Stripe Connect account created for restaurant ${restaurantId}: ${account.id}`,
    );

    // Generate OAuth link
    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      throw new Error("STRIPE_CLIENT_ID is not set in environment variables");
    }

    const oauthLink = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${restaurantId}&stripe_user[email]=${encodeURIComponent(email || "")}`;

    return {
      accountId: account.id,
      oauthLink,
      account,
    };
  } catch (error) {
    logger.error(`❌ Stripe Connect error: ${error.message}`);
    throw error;
  }
};

/**
 * Get the status of a connected account
 * @param {string} accountId - The Stripe account ID
 * @returns {Object} - Account status
 */
const getAccountStatus = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      capabilities: account.capabilities,
      requirements: account.requirements,
      businessProfile: account.business_profile,
    };
  } catch (error) {
    logger.error(`❌ Failed to get account status: ${error.message}`);
    throw error;
  }
};

/**
 * Create a payment intent for a restaurant
 * @param {number} amount - Amount in dollars
 * @param {string} currency - Currency code
 * @param {string} restaurantStripeAccountId - The restaurant's Stripe account ID
 * @param {Object} metadata - Metadata for the payment
 * @param {string} customerEmail - Customer email for receipt
 * @param {string} orderReference - Order reference number
 * @param {string} restaurantName - Restaurant name for statement descriptor
 * @returns {Object} - Payment intent details
 */
const createPaymentIntentForRestaurant = async (
  amount,
  currency,
  restaurantStripeAccountId,
  metadata = {},
  customerEmail = null,
  orderReference = "",
  restaurantName = "",
) => {
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    if (!restaurantStripeAccountId) {
      throw new Error("Restaurant Stripe account ID is required");
    }

    // Create payment intent with transfer to connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || "usd",
      metadata: {
        ...metadata,
        orderReference: orderReference || "",
        platform: "Hinarok",
      },
      receipt_email: customerEmail || undefined,
      description: `Order #${orderReference || "New Order"} - ${restaurantName || "Restaurant"}`,
      statement_descriptor_suffix: restaurantName
        ? restaurantName.slice(0, 22)
        : "Hinarok Order",
      // Transfer to connected account (restaurant receives the full amount)
      transfer_data: {
        destination: restaurantStripeAccountId,
      },
    });

    logger.info(
      `✅ Payment intent created for order ${orderReference}: ${paymentIntent.id}`,
    );
    logger.info(`   → Amount: $${amount} ${currency}`);
    logger.info(`   → Destination: ${restaurantStripeAccountId}`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    logger.error(`❌ Failed to create payment intent: ${error.message}`);
    throw error;
  }
};

/**
 * Handle OAuth callback to get account ID
 * @param {string} code - Authorization code from OAuth
 * @returns {Object} - Account details
 */
const handleOAuthCallback = async (code) => {
  try {
    if (!code) {
      throw new Error("Authorization code is required");
    }

    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code: code,
    });

    logger.info(
      `✅ OAuth callback successful for account: ${response.stripe_user_id}`,
    );

    return {
      stripeAccountId: response.stripe_user_id,
      refreshToken: response.refresh_token,
      accessToken: response.access_token,
      liveMode: response.livemode,
      scope: response.scope,
    };
  } catch (error) {
    logger.error(`❌ OAuth callback error: ${error.message}`);
    throw error;
  }
};

/**
 * Handle Stripe webhook events for Connect
 * @param {Object} event - Stripe webhook event
 * @param {Object} Order - Mongoose Order model
 * @param {Object} Restaurant - Mongoose Restaurant model
 * @param {Function} sendOrderConfirmationEmail - Email function
 * @param {Function} broadcastNewOrder - SSE broadcast function
 * @returns {Object} - Result of processing
 */
const handleConnectWebhookEvent = async (
  event,
  Order,
  Restaurant,
  sendOrderConfirmationEmail,
  broadcastNewOrder,
) => {
  const { type, data } = event;

  switch (type) {
    case "payment_intent.succeeded": {
      const paymentIntent = data.object;
      const metadata = paymentIntent.metadata || {};
      const orderId = metadata.orderId;

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
      order.stripeAccountId =
        paymentIntent.transfer_data?.destination || order.stripeAccountId;
      order.paymentAmount = paymentIntent.amount / 100;
      order.paymentCurrency = paymentIntent.currency;
      await order.save();

      logger.info(`✅ Payment succeeded for order ${order.orderReference}`);
      logger.info(`   → Transfer to: ${order.stripeAccountId}`);

      // Send email confirmation
      if (order.customerEmail) {
        try {
          const restaurant = await Restaurant.findById(order.restaurantId);
          if (restaurant) {
            await sendOrderConfirmationEmail(order);
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
      const metadata = paymentIntent.metadata || {};
      const orderId = metadata.orderId;

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

    case "account.updated": {
      const account = data.object;
      const accountId = account.id;

      // Find restaurant by Stripe account ID
      const restaurant = await Restaurant.findOne({
        "stripeConnect.accountId": accountId,
      });

      if (!restaurant) {
        logger.warn(`⚠️ Restaurant not found for account: ${accountId}`);
        return { success: false, message: "Restaurant not found" };
      }

      // Update restaurant with account status
      restaurant.stripeConnect.chargesEnabled = account.charges_enabled;
      restaurant.stripeConnect.payoutsEnabled = account.payouts_enabled;
      restaurant.stripeConnect.detailsSubmitted = account.details_submitted;

      if (account.details_submitted) {
        restaurant.stripeConnect.accountStatus = "connected";
      }

      await restaurant.save();

      logger.info(
        `✅ Account updated for restaurant ${restaurant.name}: ${accountId}`,
      );
      return { success: true, account, restaurant };
    }

    default:
      logger.info(`ℹ️ Unhandled webhook event: ${type}`);
      return { success: true, message: `Unhandled event type: ${type}` };
  }
};

module.exports = {
  stripe,
  generateConnectLink,
  getAccountStatus,
  createPaymentIntentForRestaurant,
  handleOAuthCallback,
  handleConnectWebhookEvent,
};
