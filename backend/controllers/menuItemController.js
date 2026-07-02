const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all menu items
 * @route   GET /api/menu-items
 * @access  Public
 */
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId, categoryId, isAvailable } = req.query;
    const filter = {};

    if (restaurantId) filter.restaurantId = restaurantId;
    if (categoryId) filter.categoryId = categoryId;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

    const menuItems = await MenuItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    logger.error(`Get menu items error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch menu items',
    });
  }
};

/**
 * @desc    Get menu items by restaurant
 * @route   GET /api/menu-items/restaurant/:restaurantId
 * @access  Public
 */
exports.getMenuItemsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { categoryId, includeHidden } = req.query;

    const filter = { restaurantId };
    
    if (categoryId) filter.categoryId = categoryId;
    if (includeHidden !== 'true') {
      filter.availability = { $ne: 'hidden' };
    }

    const menuItems = await MenuItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    logger.error(`Get menu items by restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch menu items',
    });
  }
};

/**
 * @desc    Get menu item by ID
 * @route   GET /api/menu-items/:id
 * @access  Public
 */
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('categoryId', 'name');

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Menu item'),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    logger.error(`Get menu item by ID error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch menu item',
    });
  }
};

/**
 * @desc    Create a menu item
 * @route   POST /api/menu-items
 * @access  Admin or Restaurant Owner
 */
exports.createMenuItem = async (req, res) => {
  try {
    const {
      restaurantId,
      categoryId,
      name,
      description,
      price,
      image,
      availability,
      displayOrder,
    } = req.body;

    // Validate required fields
    if (!restaurantId || !categoryId || !name || price === undefined || price === null || price === '') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Restaurant ID, category ID, name, and price are required',
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Category'),
      });
    }

    // Parse price to float
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Price must be a valid positive number',
      });
    }

    // Build menu item data with defaults
    const menuItemData = {
      restaurantId,
      categoryId,
      name: name.trim(),
      description: description && description.trim() ? description.trim() : '',
      price: parsedPrice,
      image: image && image.trim() ? image.trim() : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      availability: availability || 'available',
      isAvailable: availability !== 'hidden',
      displayOrder: displayOrder || 0,
    };

    const menuItem = await MenuItem.create(menuItemData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_CREATED('Menu item'),
      data: menuItem,
    });
  } catch (error) {
    logger.error(`Create menu item error: ${error.message}`);
    console.error('❌ Create menu item error details:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to create menu item',
    });
  }
};

/**
 * @desc    Update a menu item
 * @route   PUT /api/menu-items/:id
 * @access  Admin or Restaurant Owner
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      image,
      availability,
      isAvailable,
      displayOrder,
    } = req.body;

    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Menu item'),
      });
    }

    // Update fields
    if (categoryId) menuItem.categoryId = categoryId;
    if (name) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        menuItem.price = parsedPrice;
      }
    }
    if (image) menuItem.image = image;
    if (availability) {
      menuItem.availability = availability;
      menuItem.isAvailable = availability !== 'hidden';
    }
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;
    if (displayOrder !== undefined) menuItem.displayOrder = displayOrder;
    menuItem.updatedAt = new Date();

    await menuItem.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED('Menu item'),
      data: menuItem,
    });
  } catch (error) {
    logger.error(`Update menu item error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update menu item',
    });
  }
};

/**
 * @desc    Delete a menu item
 * @route   DELETE /api/menu-items/:id
 * @access  Admin or Restaurant Owner
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Menu item'),
      });
    }

    await menuItem.deleteOne();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_DELETED('Menu item'),
    });
  } catch (error) {
    logger.error(`Delete menu item error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete menu item',
    });
  }
};