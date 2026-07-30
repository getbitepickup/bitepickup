const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const {
  HTTP_STATUS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} = require("../utils/constants");
const logger = require("../utils/logger");

/**
 * Helper function to resolve restaurantId from user object
 */
const resolveRestaurantId = (user) => {
  if (!user) return null;

  if (typeof user.restaurantId === "string") {
    if (
      user.restaurantId &&
      user.restaurantId !== "null" &&
      user.restaurantId !== "undefined"
    ) {
      return user.restaurantId;
    }
  }

  if (user.restaurantId && typeof user.restaurantId === "object") {
    if (user.restaurantId._id) {
      return user.restaurantId._id.toString();
    }
    if (user.restaurantId.id) {
      return user.restaurantId.id.toString();
    }
    if (
      user.restaurantId.toString &&
      user.restaurantId.toString() !== "[object Object]"
    ) {
      return user.restaurantId.toString();
    }
  }

  if (
    user.restaurantId &&
    user.restaurantId !== "null" &&
    user.restaurantId !== "undefined"
  ) {
    return String(user.restaurantId);
  }

  return null;
};

/**
 * @desc    Get restaurant settings
 * @route   GET /api/settings/restaurant/:restaurantId
 * @access  Restaurant Owner or Admin
 */
exports.getRestaurantSettings = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // ✅ FIX: Check if user has permission to view this restaurant's settings
    if (req.user && req.user.role !== "admin") {
      let userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        const restaurant = await Restaurant.findOne({
          createdBy: req.user._id,
        });
        if (restaurant) {
          userRestaurantId = restaurant._id.toString();
        }
      }

      if (!userRestaurantId) {
        const restaurants = await Restaurant.find({});
        for (const restaurant of restaurants) {
          const owner = await User.findOne({
            restaurantId: restaurant._id,
            role: "restaurant_owner",
          });
          if (owner && owner.email === req.user.email) {
            userRestaurantId = restaurant._id.toString();
            break;
          }
        }
      }

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      if (userRestaurantId.toString() !== restaurantId.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to view these settings",
        });
      }
    }

    const restaurant = await Restaurant.findById(restaurantId).select(
      "businessHours pickupSettings taxesAndFees isOrderingPaused isActive",
    );

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    logger.error(`Get restaurant settings error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch restaurant settings",
    });
  }
};

/**
 * @desc    Update restaurant settings
 * @route   PUT /api/settings/restaurant/:restaurantId
 * @access  Restaurant Owner or Admin
 */
exports.updateRestaurantSettings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { businessHours, pickupSettings, taxesAndFees, isOrderingPaused } =
      req.body;

    // ✅ FIX: Check if user has permission to update this restaurant's settings
    if (req.user && req.user.role !== "admin") {
      let userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        const restaurant = await Restaurant.findOne({
          createdBy: req.user._id,
        });
        if (restaurant) {
          userRestaurantId = restaurant._id.toString();
        }
      }

      if (!userRestaurantId) {
        const restaurants = await Restaurant.find({});
        for (const restaurant of restaurants) {
          const owner = await User.findOne({
            restaurantId: restaurant._id,
            role: "restaurant_owner",
          });
          if (owner && owner.email === req.user.email) {
            userRestaurantId = restaurant._id.toString();
            break;
          }
        }
      }

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      if (userRestaurantId.toString() !== restaurantId.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to update these settings",
        });
      }
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    // Update settings
    if (businessHours) restaurant.businessHours = businessHours;
    if (pickupSettings) restaurant.pickupSettings = pickupSettings;
    if (taxesAndFees) restaurant.taxesAndFees = taxesAndFees;
    if (isOrderingPaused !== undefined)
      restaurant.isOrderingPaused = isOrderingPaused;

    restaurant.updatedAt = new Date();
    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED("Settings"),
      data: {
        businessHours: restaurant.businessHours,
        pickupSettings: restaurant.pickupSettings,
        taxesAndFees: restaurant.taxesAndFees,
        isOrderingPaused: restaurant.isOrderingPaused,
      },
    });
  } catch (error) {
    logger.error(`Update restaurant settings error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update restaurant settings",
    });
  }
};

/**
 * @desc    Toggle ordering pause
 * @route   PUT /api/settings/restaurant/:restaurantId/toggle-pause
 * @access  Restaurant Owner or Admin
 */
exports.toggleOrderingPause = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // ✅ FIX: Check if user has permission to toggle this restaurant's pause
    if (req.user && req.user.role !== "admin") {
      let userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        const restaurant = await Restaurant.findOne({
          createdBy: req.user._id,
        });
        if (restaurant) {
          userRestaurantId = restaurant._id.toString();
        }
      }

      if (!userRestaurantId) {
        const restaurants = await Restaurant.find({});
        for (const restaurant of restaurants) {
          const owner = await User.findOne({
            restaurantId: restaurant._id,
            role: "restaurant_owner",
          });
          if (owner && owner.email === req.user.email) {
            userRestaurantId = restaurant._id.toString();
            break;
          }
        }
      }

      if (!userRestaurantId) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      if (userRestaurantId.toString() !== restaurantId.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to toggle ordering pause",
        });
      }
    }

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    restaurant.isOrderingPaused = !restaurant.isOrderingPaused;
    restaurant.updatedAt = new Date();
    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Ordering ${restaurant.isOrderingPaused ? "paused" : "resumed"} successfully`,
      data: {
        isOrderingPaused: restaurant.isOrderingPaused,
      },
    });
  } catch (error) {
    logger.error(`Toggle ordering pause error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to toggle ordering pause",
    });
  }
};
