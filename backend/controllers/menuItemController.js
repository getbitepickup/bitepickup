const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");
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
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === "true";

    const menuItems = await MenuItem.find(filter)
      .populate("categoryId", "name")
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    logger.error(`Get menu items error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch menu items",
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

    // ✅ FIX: When includeHidden is not 'true', hide BOTH hidden AND out_of_stock items
    if (includeHidden !== "true") {
      filter.availability = { $nin: ["hidden", "out_of_stock"] };
    }

    const menuItems = await MenuItem.find(filter)
      .populate("categoryId", "name")
      .sort({ displayOrder: 1, name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    logger.error(`Get menu items by restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch menu items",
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
    const menuItem = await MenuItem.findById(req.params.id).populate(
      "categoryId",
      "name",
    );

    if (!menuItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Menu item"),
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
      message: "Failed to fetch menu item",
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
    if (
      !restaurantId ||
      !categoryId ||
      !name ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Restaurant ID, category ID, name, and price are required",
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Category"),
      });
    }

    // ✅ FIX: Check if user has permission to create menu item for this restaurant
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

      const userRestaurantIdStr = userRestaurantId.toString();
      const requestedRestaurantIdStr = restaurantId.toString();

      if (userRestaurantIdStr !== requestedRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message:
            "You do not have permission to create menu items for this restaurant",
        });
      }
    }

    // Parse price to float
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    // ✅ FIX: Set isAvailable based on availability
    let isAvailable = true;
    if (availability === "hidden" || availability === "out_of_stock") {
      isAvailable = false;
    }

    // Build menu item data with defaults
    const menuItemData = {
      restaurantId,
      categoryId,
      name: name.trim(),
      description: description && description.trim() ? description.trim() : "",
      price: parsedPrice,
      image:
        image && image.trim()
          ? image.trim()
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
      availability: availability || "available",
      isAvailable: isAvailable,
      displayOrder: displayOrder || 0,
    };

    const menuItem = await MenuItem.create(menuItemData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_CREATED("Menu item"),
      data: menuItem,
    });
  } catch (error) {
    logger.error(`Create menu item error: ${error.message}`);
    console.error("❌ Create menu item error details:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to create menu item",
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
        message: ERROR_MESSAGES.NOT_FOUND("Menu item"),
      });
    }

    // ✅ FIX: Check if user has permission to update this menu item
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

      const userRestaurantIdStr = userRestaurantId.toString();
      const menuItemRestaurantIdStr = menuItem.restaurantId.toString();

      if (userRestaurantIdStr !== menuItemRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to update this menu item",
        });
      }
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

    // ✅ FIX: Properly handle availability and isAvailable together
    if (availability) {
      menuItem.availability = availability;
      // Set isAvailable based on availability
      if (availability === "available") {
        menuItem.isAvailable = true;
      } else if (availability === "out_of_stock" || availability === "hidden") {
        menuItem.isAvailable = false;
      }
    }

    // If isAvailable is explicitly provided, use it (but only if availability wasn't set)
    if (isAvailable !== undefined && !availability) {
      menuItem.isAvailable = isAvailable;
    }

    if (displayOrder !== undefined) menuItem.displayOrder = displayOrder;
    menuItem.updatedAt = new Date();

    await menuItem.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED("Menu item"),
      data: menuItem,
    });
  } catch (error) {
    logger.error(`Update menu item error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update menu item",
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
        message: ERROR_MESSAGES.NOT_FOUND("Menu item"),
      });
    }

    // ✅ FIX: Check if user has permission to delete this menu item
    if (req.user && req.user.role !== "admin") {
      let userRestaurantId = resolveRestaurantId(req.user);

      if (!userRestaurantId) {
        // Try to find restaurant by createdBy
        const restaurant = await Restaurant.findOne({
          createdBy: req.user._id,
        });
        if (restaurant) {
          userRestaurantId = restaurant._id.toString();
        }
      }

      // Try email match if still null
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

      const userRestaurantIdStr = userRestaurantId.toString();
      const menuItemRestaurantIdStr = menuItem.restaurantId.toString();

      if (userRestaurantIdStr !== menuItemRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to delete this menu item",
        });
      }
    }

    await menuItem.deleteOne();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_DELETED("Menu item"),
    });
  } catch (error) {
    logger.error(`Delete menu item error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to delete menu item",
    });
  }
};
