const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const filter = {};
    
    if (restaurantId) {
      // Convert to ObjectId if it's a valid one, otherwise use as is
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        filter.restaurantId = restaurantId;
      } else {
        // Try to find by restaurantId as string (for backward compatibility)
        filter.restaurantId = restaurantId;
      }
    }

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error(`Get categories error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

/**
 * @desc    Get categories by restaurant
 * @route   GET /api/categories/restaurant/:restaurantId
 * @access  Public
 */
exports.getCategoriesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Validate if it's a valid ObjectId
    let filter = {};
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      filter = { restaurantId };
    } else {
      // Try to find by restaurantId as string
      filter = { restaurantId };
    }

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error(`Get categories by restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

/**
 * @desc    Get category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Category'),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error(`Get category by ID error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch category',
    });
  }
};

/**
 * @desc    Create a category
 * @route   POST /api/categories
 * @access  Admin or Restaurant Owner
 */
exports.createCategory = async (req, res) => {
  try {
    const { restaurantId, name, displayOrder } = req.body;

    if (!restaurantId || !name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Restaurant ID and name are required',
      });
    }

    // Validate restaurantId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid restaurant ID format',
      });
    }

    const category = await Category.create({
      restaurantId,
      name,
      displayOrder: displayOrder || 0,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_CREATED('Category'),
      data: category,
    });
  } catch (error) {
    logger.error(`Create category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create category',
    });
  }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Admin or Restaurant Owner
 */
exports.updateCategory = async (req, res) => {
  try {
    const { name, displayOrder } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Category'),
      });
    }

    if (name) category.name = name;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    category.updatedAt = new Date();

    await category.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED('Category'),
      data: category,
    });
  } catch (error) {
    logger.error(`Update category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update category',
    });
  }
};

/**
 * @desc    Delete a category (cascades to menu items)
 * @route   DELETE /api/categories/:id
 * @access  Admin or Restaurant Owner
 */
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Category'),
      });
    }

    // Delete all menu items in this category
    await MenuItem.deleteMany({ categoryId: category._id });

    // Delete the category
    await category.deleteOne();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_DELETED('Category'),
    });
  } catch (error) {
    logger.error(`Delete category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete category',
    });
  }
};