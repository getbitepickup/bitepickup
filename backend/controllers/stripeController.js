const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");
const {
  generateConnectLink,
  getAccountStatus,
  handleOAuthCallback,
} = require("../services/stripeConnectService");
const logger = require("../utils/logger");
const { HTTP_STATUS } = require("../utils/constants");

/**
 * Get Stripe Connect OAuth link for a restaurant
 * @route GET /api/stripe/connect/:restaurantId
 */
exports.getConnectLink = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    // Find restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Check if already connected
    if (
      restaurant.stripeConnect?.accountId &&
      restaurant.stripeConnect?.accountStatus === "connected"
    ) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          isConnected: true,
          accountId: restaurant.stripeConnect.accountId,
          chargesEnabled: restaurant.stripeConnect.chargesEnabled,
          payoutsEnabled: restaurant.stripeConnect.payoutsEnabled,
          message: "Restaurant is already connected to Stripe",
        },
      });
    }

    // Get the user email from the request or restaurant
    const email =
      req.user?.email ||
      restaurant.stripeConnect?.accountEmail ||
      "orders@hinarok.com";

    // Generate connect link
    const result = await generateConnectLink(
      restaurantId,
      restaurant.name,
      email,
    );

    // Save account ID to restaurant
    restaurant.stripeConnect.accountId = result.accountId;
    restaurant.stripeConnect.accountStatus = "onboarding";
    restaurant.stripeConnect.accountEmail = email;
    await restaurant.save();

    logger.info(`✅ Connect link generated for restaurant ${restaurant.name}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        oauthLink: result.oauthLink,
        accountId: result.accountId,
        isConnected: false,
      },
    });
  } catch (error) {
    logger.error(`❌ Get connect link error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to generate connect link",
    });
  }
};

/**
 * Get Stripe Connect account status
 * @route GET /api/stripe/status/:restaurantId
 */
exports.getAccountStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const accountId = restaurant.stripeConnect?.accountId;
    if (!accountId) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          isConnected: false,
          message: "Restaurant has not connected Stripe yet",
        },
      });
    }

    // Get fresh status from Stripe
    const status = await getAccountStatus(accountId);

    // Update restaurant with latest status
    restaurant.stripeConnect.chargesEnabled = status.chargesEnabled;
    restaurant.stripeConnect.payoutsEnabled = status.payoutsEnabled;
    restaurant.stripeConnect.detailsSubmitted = status.detailsSubmitted;

    if (
      status.detailsSubmitted &&
      status.chargesEnabled &&
      status.payoutsEnabled
    ) {
      restaurant.stripeConnect.accountStatus = "connected";
    } else if (status.detailsSubmitted) {
      restaurant.stripeConnect.accountStatus = "onboarding";
    }

    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        isConnected: restaurant.stripeConnect.accountStatus === "connected",
        accountId: accountId,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        requirements: status.requirements,
        capabilities: status.capabilities,
        status: restaurant.stripeConnect.accountStatus,
      },
    });
  } catch (error) {
    logger.error(`❌ Get account status error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to get account status",
    });
  }
};

/**
 * OAuth callback endpoint (public)
 * @route GET /api/stripe/oauth/callback
 */
exports.oauthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Missing authorization code",
      });
    }

    // Handle OAuth callback
    const result = await handleOAuthCallback(code);

    // Update restaurant with Stripe account ID
    const restaurant = await Restaurant.findByIdAndUpdate(
      state,
      {
        "stripeConnect.accountId": result.stripeAccountId,
        "stripeConnect.accountStatus": "onboarding",
        "stripeConnect.connectedAt": new Date(),
        "stripeConnect.refreshToken": result.refreshToken,
        "stripeConnect.accessToken": result.accessToken,
      },
      { new: true },
    );

    if (!restaurant) {
      logger.warn(`⚠️ Restaurant not found for OAuth callback: ${state}`);
      return res.redirect(
        `${process.env.CLIENT_URL}/restaurant-dashboard?stripe=error&message=restaurant_not_found`,
      );
    }

    logger.info(
      `✅ OAuth callback successful for restaurant ${restaurant.name}`,
    );

    // Redirect back to restaurant dashboard with success
    res.redirect(
      `${process.env.CLIENT_URL}/restaurant-dashboard/${state}?stripe=connected&account=${result.stripeAccountId}`,
    );
  } catch (error) {
    logger.error(`❌ OAuth callback error: ${error.message}`);
    res.redirect(
      `${process.env.CLIENT_URL}/restaurant-dashboard?stripe=error&message=${encodeURIComponent(error.message)}`,
    );
  }
};

/**
 * Disconnect Stripe account from restaurant
 * @route DELETE /api/stripe/disconnect/:restaurantId
 */
exports.disconnectAccount = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Clear Stripe Connect data
    restaurant.stripeConnect = {
      accountId: null,
      accountStatus: "pending",
      connectedAt: null,
      accountEmail: restaurant.stripeConnect?.accountEmail || "",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };

    await restaurant.save();

    logger.info(
      `✅ Stripe account disconnected for restaurant ${restaurant.name}`,
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Stripe account disconnected successfully",
    });
  } catch (error) {
    logger.error(`❌ Disconnect error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to disconnect account",
    });
  }
};
