const { HTTP_STATUS, ERROR_MESSAGES, USER_ROLES } = require('../utils/constants');

/**
 * Check if user has any of the allowed roles
 */
const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.FORBIDDEN,
      });
    }

    next();
  };
};

/**
 * Check if user has admin role
 */
const requireAdmin = hasRole([USER_ROLES.ADMIN]);

/**
 * Check if user has admin or restaurant owner role
 */
const requireAdminOrOwner = hasRole([USER_ROLES.ADMIN, USER_ROLES.RESTAURANT_OWNER]);

/**
 * Check if user is authenticated (any role)
 */
const requireAuth = hasRole([USER_ROLES.ADMIN, USER_ROLES.RESTAURANT_OWNER, USER_ROLES.CUSTOMER]);

module.exports = {
  hasRole,
  requireAdmin,
  requireAdminOrOwner,
  requireAuth,
};