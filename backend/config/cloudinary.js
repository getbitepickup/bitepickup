const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to file or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'hinarok',
      transformation: options.transformation || [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    logger.info(`✅ Image uploaded to Cloudinary: ${result.public_id}`);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    logger.error(`❌ Cloudinary upload error: ${error.message}`);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return { success: true, message: 'No public ID provided' };
    
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`✅ Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error(`❌ Cloudinary delete error: ${error.message}`);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Get optimized image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
  if (!publicId) return null;
  
  const transformations = [];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  const transformationString = transformations.join(',');
  
  if (transformationString) {
    return cloudinary.url(publicId, {
      transformation: transformationString,
    });
  }
  
  return cloudinary.url(publicId);
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
};