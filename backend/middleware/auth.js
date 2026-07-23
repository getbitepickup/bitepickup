const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const { HTTP_STATUS, ERROR_MESSAGES } = require("../utils/constants");
const logger = require("../utils/logger");

/**
 * Helper function to resolve restaurantId from user object
 * Handles all possible formats: string, ObjectId, object with _id/id
 */
const resolveRestaurantId = (user) => {
  if (!user) return null;

  // If user has restaurantId directly as string
  if (typeof user.restaurantId === "string") {
    return user.restaurantId;
  }

  // If user has restaurantId as object with _id
  if (user.restaurantId && typeof user.restaurantId === "object") {
    if (user.restaurantId._id) {
      return user.restaurantId._id.toString();
    }
    if (user.restaurantId.id) {
      return user.restaurantId.id.toString();
    }
    // Try to convert whole object to string
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

    // Find user with restaurantId populated
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

    // ✅ Convert user to plain object
    const userObj = user.toObject ? user.toObject() : { ...user };

    // ✅ Ensure restaurantId is properly resolved to a string
    let restaurantId = resolveRestaurantId(userObj);

    // ✅ FIX: If still null and user is restaurant_owner, try to find restaurant by createdBy
    if (!restaurantId && userObj.role === "restaurant_owner") {
      try {
        const restaurant = await Restaurant.findOne({
          createdBy: userObj._id,
        });
        if (restaurant) {
          restaurantId = restaurant._id.toString();
          console.log("🔄 Auth: Found restaurant by createdBy:", restaurantId);
        }
      } catch (err) {
        console.log(
          "⚠️ Auth: Could not find restaurant by createdBy:",
          err.message,
        );
      }
    }

    // ✅ FIX: If still null and user is restaurant_owner, try email match
    if (!restaurantId && userObj.role === "restaurant_owner") {
      try {
        const restaurants = await Restaurant.find({});
        for (const restaurant of restaurants) {
          const owner = await User.findOne({
            restaurantId: restaurant._id,
            role: "restaurant_owner",
          });
          if (owner && owner.email === userObj.email) {
            restaurantId = restaurant._id.toString();
            console.log(
              "🔄 Auth: Found restaurant by email match:",
              restaurantId,
            );
            break;
          }
        }
      } catch (err) {
        console.log(
          "⚠️ Auth: Could not find restaurant by email:",
          err.message,
        );
      }
    }

    // ✅ FIX: If still null and user is restaurant_owner, try to find restaurant by matching restaurant name (fallback)
    if (!restaurantId && userObj.role === "restaurant_owner") {
      try {
        // Try to find a restaurant where the user is the owner (last resort)
        const restaurants = await Restaurant.find({});
        for (const restaurant of restaurants) {
          // Check if this restaurant has any owner with the same email or userId
          const owner = await User.findOne({
            $or: [
              { restaurantId: restaurant._id, role: "restaurant_owner" },
              { _id: userObj._id, role: "restaurant_owner" },
            ],
          });
          if (
            owner &&
            (owner.email === userObj.email ||
              owner._id.toString() === userObj._id.toString())
          ) {
            restaurantId = restaurant._id.toString();
            console.log(
              "🔄 Auth: Found restaurant by owner match (last resort):",
              restaurantId,
            );
            break;
          }
        }
      } catch (err) {
        console.log(
          "⚠️ Auth: Could not find restaurant by owner match:",
          err.message,
        );
      }
    }

    userObj.restaurantId = restaurantId;

    // ✅ Log authentication success
    console.log("✅ Auth middleware - User authenticated:", {
      id: userObj._id,
      email: userObj.email,
      role: userObj.role,
      restaurantId: restaurantId,
      userId: userObj._id,
    });

    // Attach user to request
    req.user = userObj;

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
 * Handles various formats: id in params, restaurantId in params, or restaurantId in body
 */
const ownsRestaurant = async (req, res, next) => {
  // Get restaurantId from various sources
  let restaurantId =
    req.params.id || req.params.restaurantId || req.body.restaurantId;

  // If not found, check if it's in the URL path
  if (!restaurantId && req.params && req.params.id) {
    restaurantId = req.params.id;
  }

  console.log("🔑 ownsRestaurant middleware - Checking ownership:", {
    restaurantId: restaurantId,
    userRole: req.user?.role,
    userRestaurantId: req.user?.restaurantId,
  });

  if (!restaurantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: "Restaurant ID is required",
    });
  }

  // Admin can access any restaurant
  if (req.user.role === "admin") {
    console.log("👑 Admin access granted for restaurant:", restaurantId);
    return next();
  }

  // Check if user has a restaurantId assigned
  if (!req.user.restaurantId) {
    console.log("❌ User has no restaurantId assigned");
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "You do not have a restaurant assigned to your account",
    });
  }

  // Convert both to strings for comparison
  const userRestaurantIdStr = req.user.restaurantId.toString();
  const requestedRestaurantIdStr = restaurantId.toString();

  console.log("🔑 Comparing restaurant IDs:", {
    userRestaurantId: userRestaurantIdStr,
    requestedRestaurantId: requestedRestaurantIdStr,
    match: userRestaurantIdStr === requestedRestaurantIdStr,
  });

  if (userRestaurantIdStr === requestedRestaurantIdStr) {
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
