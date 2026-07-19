const {
  uploadRestaurantLogo,
  uploadRestaurantCover,
  uploadMenuItemImage,
  deleteUploadedImage,
} = require("../services/uploadService");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const {
  HTTP_STATUS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} = require("../utils/constants");
const logger = require("../utils/logger");

/**
 * Convert buffer to base64 for Cloudinary upload
 */
const bufferToBase64 = (buffer) => {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
};

/**
 * @desc    Upload restaurant logo
 * @route   POST /api/upload/restaurant/:restaurantId/logo
 * @access  Admin or Restaurant Owner
 */
exports.uploadRestaurantLogo = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    // Convert buffer to base64
    const base64Image = bufferToBase64(req.file.buffer);

    // Upload to Cloudinary
    const result = await uploadRestaurantLogo(base64Image, restaurantId);

    // Update restaurant with new logo URL
    restaurant.logo = result.url;
    await restaurant.save();

    logger.info(`✅ Restaurant logo updated: ${restaurantId}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Restaurant logo uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    logger.error(`❌ Upload restaurant logo error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to upload restaurant logo",
    });
  }
};

/**
 * @desc    Upload restaurant cover image
 * @route   POST /api/upload/restaurant/:restaurantId/cover
 * @access  Admin or Restaurant Owner
 */
exports.uploadRestaurantCover = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    // Convert buffer to base64
    const base64Image = bufferToBase64(req.file.buffer);

    // Upload to Cloudinary
    const result = await uploadRestaurantCover(base64Image, restaurantId);

    // Update restaurant with new cover URL
    restaurant.coverImage = result.url;
    await restaurant.save();

    logger.info(`✅ Restaurant cover updated: ${restaurantId}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Restaurant cover image uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    logger.error(`❌ Upload restaurant cover error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to upload restaurant cover",
    });
  }
};

/**
 * @desc    Upload menu item image
 * @route   POST /api/upload/menu-item/:menuItemId
 * @access  Admin or Restaurant Owner
 */
exports.uploadMenuItemImage = async (req, res) => {
  try {
    const { menuItemId } = req.params;

    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "No image file provided",
      });
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Menu item"),
      });
    }

    // ✅ FIX: Ensure restaurantId exists on the menu item
    if (!menuItem.restaurantId) {
      logger.error(`❌ Menu item ${menuItemId} has no restaurantId`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message:
          "Restaurant ID is required. Please ensure the menu item has a restaurant associated.",
      });
    }

    // Convert buffer to base64
    const base64Image = bufferToBase64(req.file.buffer);

    // Upload to Cloudinary
    const result = await uploadMenuItemImage(
      base64Image,
      menuItem.restaurantId.toString(),
      menuItemId,
    );

    // Update menu item with new image URL
    menuItem.image = result.url;
    await menuItem.save();

    logger.info(`✅ Menu item image updated: ${menuItemId}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Menu item image uploaded successfully",
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    logger.error(`❌ Upload menu item image error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to upload menu item image",
    });
  }
};

/**
 * @desc    Delete uploaded image
 * @route   DELETE /api/upload/:publicId
 * @access  Admin or Restaurant Owner
 */
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Public ID is required",
      });
    }

    const result = await deleteUploadedImage(publicId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Image deleted successfully",
      data: result,
    });
  } catch (error) {
    logger.error(`❌ Delete image error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to delete image",
    });
  }
};
