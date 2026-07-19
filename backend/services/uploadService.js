const { uploadImage, deleteImage } = require("../config/cloudinary");
const logger = require("../utils/logger");
const path = require("path");

/**
 * Upload restaurant logo
 * @param {string} file - File path or base64 string
 * @param {string} restaurantId - Restaurant ID for folder organization
 * @returns {Promise<Object>} - Upload result
 */
const uploadRestaurantLogo = async (file, restaurantId) => {
  try {
    const result = await uploadImage(file, {
      folder: `hinarok/restaurants/${restaurantId}/logo`,
      transformation: [
        { width: 300, height: 300, crop: "fill", gravity: "center" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return result;
  } catch (error) {
    logger.error(`❌ Restaurant logo upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload restaurant cover image
 * @param {string} file - File path or base64 string
 * @param {string} restaurantId - Restaurant ID for folder organization
 * @returns {Promise<Object>} - Upload result
 */
const uploadRestaurantCover = async (file, restaurantId) => {
  try {
    const result = await uploadImage(file, {
      folder: `hinarok/restaurants/${restaurantId}/cover`,
      transformation: [
        { width: 1600, height: 400, crop: "fill", gravity: "center" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return result;
  } catch (error) {
    logger.error(`❌ Restaurant cover upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Upload menu item image
 * @param {string} file - File path or base64 string
 * @param {string} restaurantId - Restaurant ID for folder organization
 * @param {string} menuItemId - Menu item ID
 * @returns {Promise<Object>} - Upload result
 */
const uploadMenuItemImage = async (file, restaurantId, menuItemId) => {
  try {
    // ✅ FIX: Validate restaurantId
    if (!restaurantId) {
      throw new Error("Restaurant ID is required for menu item image upload");
    }

    const result = await uploadImage(file, {
      folder: `hinarok/restaurants/${restaurantId}/menu-items`,
      public_id: menuItemId || undefined,
      transformation: [
        { width: 600, height: 400, crop: "fill", gravity: "center" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return result;
  } catch (error) {
    logger.error(`❌ Menu item image upload error: ${error.message}`);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteUploadedImage = async (publicId) => {
  return await deleteImage(publicId);
};

module.exports = {
  uploadRestaurantLogo,
  uploadRestaurantCover,
  uploadMenuItemImage,
  deleteUploadedImage,
};
