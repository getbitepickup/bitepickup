const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { HTTP_STATUS, ERROR_MESSAGES } = require("../utils/constants");
const logger = require("../utils/logger");

/**
 * Middleware to authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    if (!user.isActive) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // ✅ Ensure restaurantId is accessible as a string
    if (user.restaurantId) {
      // If restaurantId is an object, extract the id
      if (typeof user.restaurantId === "object" && user.restaurantId._id) {
        user.restaurantId = user.restaurantId._id;
      } else if (
        typeof user.restaurantId === "object" &&
        user.restaurantId.id
      ) {
        user.restaurantId = user.restaurantId.id;
      } else if (typeof user.restaurantId === "object") {
        // Try to convert the object to string using toString or id property
        user.restaurantId = user.restaurantId.toString
          ? user.restaurantId.toString()
          : null;
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_INVALID,
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.TOKEN_EXPIRED,
      });
    }

    logger.error(`Authentication error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN,
    });
  }
  next();
};

/**
 * Middleware to check if user is a restaurant owner
 */
const isRestaurantOwner = (req, res, next) => {
  if (req.user.role !== "restaurant_owner") {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: ERROR_MESSAGES.FORBIDDEN,
    });
  }
  next();
};

/**
 * Middleware to check if user owns the specified restaurant
 */
const ownsRestaurant = (req, res, next) => {
  const restaurantId =
    req.params.id || req.params.restaurantId || req.body.restaurantId;

  if (!restaurantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: "Restaurant ID is required",
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  if (
    req.user.restaurantId &&
    req.user.restaurantId.toString() === restaurantId
  ) {
    return next();
  }

  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message: ERROR_MESSAGES.FORBIDDEN,
  });
};

/**
 * Middleware to protect routes - alias for authenticate
 */
const protect = authenticate;

module.exports = {
  authenticate,
  protect,
  isAdmin,
  isRestaurantOwner,
  ownsRestaurant,
};
