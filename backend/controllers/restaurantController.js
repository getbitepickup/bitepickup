const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateSlug, generateSubdomain } = require('../utils/helpers');
const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all restaurants with optional filtering
 * @route   GET /api/restaurants
 * @access  Public/Admin
 */
exports.getRestaurants = async (req, res) => {
  try {
    const { active, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const restaurants = await Restaurant.find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Get restaurants error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch restaurants',
    });
  }
};

/**
 * @desc    Get all active restaurants
 * @route   GET /api/restaurants/active
 * @access  Public
 */
exports.getActiveRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .select('name slug subdomain description logo coverImage phone address')
      .sort({ name: 1 });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    logger.error(`Get active restaurants error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch active restaurants',
    });
  }
};

/**
 * @desc    Get restaurant by ID
 * @route   GET /api/restaurants/:id
 * @access  Public
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

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
    logger.error(`Get restaurant by ID error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch restaurant',
    });
  }
};

/**
 * @desc    Get restaurant by subdomain
 * @route   GET /api/restaurants/by-subdomain/:subdomain
 * @access  Public
 */
exports.getRestaurantBySubdomain = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ 
      subdomain: req.params.subdomain 
    });

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
    logger.error(`Get restaurant by subdomain error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch restaurant',
    });
  }
};

/**
 * @desc    Create a new restaurant with owner account
 * @route   POST /api/restaurants
 * @access  Admin only
 */
exports.createRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      phone,
      address,
      logo,
      coverImage,
      ownerEmail,
      ownerPassword,
      ownerFirstName,
      ownerLastName,
      ownerPhone
    } = req.body;

    console.log('📝 Creating restaurant with data:', { name, description, phone, address, ownerEmail });

    // Validate required fields
    if (!name || !description || !phone || !address) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Restaurant name, description, phone, and address are required',
      });
    }

    if (!ownerEmail || !ownerPassword || !ownerFirstName || !ownerLastName || !ownerPhone) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Owner details (email, password, first name, last name, phone) are required',
      });
    }

    // Generate slug and subdomain
    const slug = generateSlug(name);
    const subdomain = generateSubdomain(name);

    // Check if slug or subdomain already exists
    const existingRestaurant = await Restaurant.findOne({
      $or: [{ slug }, { subdomain }],
    });

    if (existingRestaurant) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: ERROR_MESSAGES.SUBDOMAIN_TAKEN,
      });
    }

    // Check if owner email already exists
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Owner email already registered',
      });
    }

    // Create restaurant
    const restaurant = new Restaurant({
      name,
      slug,
      subdomain,
      description,
      phone,
      address,
      logo: logo || 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=100&auto=format&fit=crop&q=60',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&auto=format&fit=crop&q=80',
      isActive: true,
      isOrderingPaused: false,
      createdBy: req.user ? req.user.id : null,
      businessHours: {
        Monday: { isOpen: true, openTime: '09:00 AM', closeTime: '10:00 PM' },
        Tuesday: { isOpen: true, openTime: '09:00 AM', closeTime: '10:00 PM' },
        Wednesday: { isOpen: true, openTime: '09:00 AM', closeTime: '10:00 PM' },
        Thursday: { isOpen: true, openTime: '09:00 AM', closeTime: '10:00 PM' },
        Friday: { isOpen: true, openTime: '09:00 AM', closeTime: '11:00 PM' },
        Saturday: { isOpen: true, openTime: '10:00 AM', closeTime: '11:00 PM' },
        Sunday: { isOpen: true, openTime: '10:00 AM', closeTime: '09:00 PM' },
      },
      pickupSettings: {
        allowAsap: true,
        allowScheduled: true,
        prepTimeMinutes: 15,
      },
      taxesAndFees: {
        taxRatePercent: 8.5,
        serviceFeeAmount: 2.50,
      }
    });

    // Save restaurant to database
    await restaurant.save();
    console.log('✅ Restaurant saved to MongoDB:', restaurant._id);

    // Create owner user account
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ownerPassword, salt);

    const owner = new User({
      email: ownerEmail,
      password: hashedPassword,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      phone: ownerPhone,
      role: 'restaurant_owner',
      restaurantId: restaurant._id,
      isActive: true,
    });

    await owner.save();
    console.log('✅ Owner user saved to MongoDB:', owner._id);

    // Remove password from response
    const ownerResponse = owner.toObject();
    delete ownerResponse.password;

    // Return success with credentials
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_CREATED('Restaurant'),
      data: {
        restaurant: restaurant.toObject(),
        owner: ownerResponse,
        credentials: {
          email: ownerEmail,
          password: ownerPassword,
          loginUrl: '/login'
        }
      }
    });
  } catch (error) {
    logger.error(`Create restaurant error: ${error.message}`);
    console.error('❌ Create restaurant error details:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to create restaurant',
    });
  }
};

/**
 * @desc    Update a restaurant
 * @route   PUT /api/restaurants/:id
 * @access  Admin or Restaurant Owner
 */
exports.updateRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      phone,
      address,
      logo,
      coverImage,
      isActive,
      isOrderingPaused,
      businessHours,
      pickupSettings,
      taxesAndFees,
      slug,
      subdomain,
    } = req.body;

    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
      });
    }

    // Update fields
    if (name) {
      restaurant.name = name;
      restaurant.slug = generateSlug(name);
      restaurant.subdomain = generateSubdomain(name);
    }
    // Allow manual slug/subdomain override if provided
    if (slug) restaurant.slug = slug;
    if (subdomain) restaurant.subdomain = subdomain;
    
    if (description) restaurant.description = description;
    if (phone) restaurant.phone = phone;
    if (address) restaurant.address = address;
    if (logo) restaurant.logo = logo;
    if (coverImage) restaurant.coverImage = coverImage;
    if (isActive !== undefined) restaurant.isActive = isActive;
    if (isOrderingPaused !== undefined) restaurant.isOrderingPaused = isOrderingPaused;
    if (businessHours) restaurant.businessHours = businessHours;
    if (pickupSettings) restaurant.pickupSettings = pickupSettings;
    if (taxesAndFees) restaurant.taxesAndFees = taxesAndFees;

    restaurant.updatedAt = new Date();

    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_UPDATED('Restaurant'),
      data: restaurant,
    });
  } catch (error) {
    logger.error(`Update restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update restaurant',
    });
  }
};

/**
 * @desc    Delete a restaurant (cascading)
 * @route   DELETE /api/restaurants/:id
 * @access  Admin only
 */
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
      });
    }

    // Delete associated categories and menu items
    await Category.deleteMany({ restaurantId: restaurant._id });
    await MenuItem.deleteMany({ restaurantId: restaurant._id });
    
    // Delete associated owner user
    await User.deleteMany({ 
      restaurantId: restaurant._id,
      role: 'restaurant_owner'
    });

    // Delete restaurant
    await restaurant.deleteOne();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.RESOURCE_DELETED('Restaurant'),
    });
  } catch (error) {
    logger.error(`Delete restaurant error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete restaurant',
    });
  }
};

/**
 * @desc    Toggle restaurant active status
 * @route   PUT /api/restaurants/:id/toggle-active
 * @access  Admin or Restaurant Owner
 */
exports.toggleRestaurantActive = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NOT_FOUND('Restaurant'),
      });
    }

    restaurant.isActive = !restaurant.isActive;
    restaurant.updatedAt = new Date();
    await restaurant.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Restaurant ${restaurant.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: restaurant._id,
        isActive: restaurant.isActive,
      },
    });
  } catch (error) {
    logger.error(`Toggle restaurant active error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to toggle restaurant status',
    });
  }
};