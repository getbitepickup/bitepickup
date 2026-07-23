const Category = require("../models/Category");
const MenuItem = require("../models/MenuItem");
const Restaurant = require("../models/Restaurant");
const mongoose = require("mongoose");
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
    return user.restaurantId;
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

  return null;
};

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

    // ✅ FIX: Get categories with sorting based on restaurant preference
    let sortCriteria = { displayOrder: 1, name: 1 };

    // If restaurantId is provided, get the restaurant's sort preference
    if (restaurantId) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant && restaurant.categorySortOrder) {
        switch (restaurant.categorySortOrder) {
          case "alphabetical_asc":
            sortCriteria = { name: 1 };
            break;
          case "alphabetical_desc":
            sortCriteria = { name: -1 };
            break;
          case "created":
          default:
            sortCriteria = { displayOrder: 1, createdAt: 1 };
            break;
        }
      }
    }

    const categories = await Category.find(filter).sort(sortCriteria);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error(`Get categories error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch categories",
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

    // ✅ FIX: Get categories with sorting based on restaurant preference
    let sortCriteria = { displayOrder: 1, name: 1 };

    // Get the restaurant's sort preference
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant && restaurant.categorySortOrder) {
      switch (restaurant.categorySortOrder) {
        case "alphabetical_asc":
          sortCriteria = { name: 1 };
          break;
        case "alphabetical_desc":
          sortCriteria = { name: -1 };
          break;
        case "created":
        default:
          sortCriteria = { displayOrder: 1, createdAt: 1 };
          break;
      }
    }

    const categories = await Category.find(filter).sort(sortCriteria);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error(`Get categories by restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch categories",
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
        message: ERROR_MESSAGES.NOT_FOUND("Category"),
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
      message: "Failed to fetch category",
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
        message: "Restaurant ID and name are required",
      });
    }

    // Validate restaurantId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid restaurant ID format",
      });
    }

    // ✅ FIX: Check if user has permission to create category for this restaurant
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
            "You do not have permission to create categories for this restaurant",
        });
      }
    }

    const category = await Category.create({
      restaurantId,
      name,
      displayOrder: displayOrder || 0,
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_CREATED("Category"),
      data: category,
    });
  } catch (error) {
    logger.error(`Create category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create category",
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
        message: ERROR_MESSAGES.NOT_FOUND("Category"),
      });
    }

    // ✅ FIX: Check if user has permission to update this category
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
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have a restaurant assigned",
        });
      }

      const userRestaurantIdStr = userRestaurantId.toString();
      const categoryRestaurantIdStr = category.restaurantId.toString();

      if (userRestaurantIdStr !== categoryRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to update this category",
        });
      }
    }

    if (name) category.name = name;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    category.updatedAt = new Date();

    await category.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED("Category"),
      data: category,
    });
  } catch (error) {
    logger.error(`Update category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update category",
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
        message: ERROR_MESSAGES.NOT_FOUND("Category"),
      });
    }

    // ✅ FIX: Check if user has permission to delete this category
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
      const categoryRestaurantIdStr = category.restaurantId.toString();

      if (userRestaurantIdStr !== categoryRestaurantIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to delete this category",
        });
      }
    }

    // Delete all menu items in this category
    await MenuItem.deleteMany({ categoryId: category._id });

    // Delete the category
    await category.deleteOne();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_DELETED("Category"),
    });
  } catch (error) {
    logger.error(`Delete category error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

/**
 * @desc    Update category sort order for a restaurant
 * @route   PUT /api/categories/sort-order/:restaurantId
 * @access  Restaurant Owner or Admin
 */
exports.updateCategorySortOrder = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { sortOrder } = req.body;

    // Validate sortOrder value
    const validSortOrders = [
      "created",
      "alphabetical_asc",
      "alphabetical_desc",
    ];
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message:
          "Invalid sort order. Must be: created, alphabetical_asc, or alphabetical_desc",
      });
    }

    // Find and update restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    restaurant.categorySortOrder = sortOrder;
    restaurant.updatedAt = new Date();
    await restaurant.save();

    logger.info(
      `✅ Category sort order updated for restaurant ${restaurant.name}: ${sortOrder}`,
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Category sort order updated successfully",
      data: {
        categorySortOrder: restaurant.categorySortOrder,
      },
    });
  } catch (error) {
    logger.error(`Update category sort order error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update category sort order",
    });
  }
};

/**
 * @desc    Get category sort order for a restaurant
 * @route   GET /api/categories/sort-order/:restaurantId
 * @access  Public
 */
exports.getCategorySortOrder = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND("Restaurant"),
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        categorySortOrder: restaurant.categorySortOrder || "created",
      },
    });
  } catch (error) {
    logger.error(`Get category sort order error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to get category sort order",
    });
  }
};
