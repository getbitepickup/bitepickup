const Restaurant = require('../models/Restaurant');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get restaurant settings
 * @route   GET /api/settings/restaurant/:restaurantId
 * @access  Restaurant Owner or Admin
 */
exports.getRestaurantSettings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId)
      .select('businessHours pickupSettings taxesAndFees isOrderingPaused isActive');

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
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
      message: 'Failed to fetch restaurant settings',
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
    const { businessHours, pickupSettings, taxesAndFees, isOrderingPaused } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
      });
    }

    // Update settings
    if (businessHours) restaurant.businessHours = businessHours;
    if (pickupSettings) restaurant.pickupSettings = pickupSettings;
    if (taxesAndFees) restaurant.taxesAndFees = taxesAndFees;
    if (isOrderingPaused !== undefined) restaurant.isOrderingPaused = isOrderingPaused;

    restaurant.updatedAt = new Date();
    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED('Settings'),
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
      message: 'Failed to update restaurant settings',
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
    
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
      });
    }

    restaurant.isOrderingPaused = !restaurant.isOrderingPaused;
    restaurant.updatedAt = new Date();
    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Ordering ${restaurant.isOrderingPaused ? 'paused' : 'resumed'} successfully`,
      data: {
        isOrderingPaused: restaurant.isOrderingPaused,
      },
    });
  } catch (error) {
    logger.error(`Toggle ordering pause error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to toggle ordering pause',
    });
  }
};