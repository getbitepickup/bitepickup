/**
 * Application-wide constants
 */

// Order statuses
const ORDER_STATUS = {
  NEW: 'NEW',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  RESTAURANT_OWNER: 'restaurant_owner',
  CUSTOMER: 'customer',
};

// Payment methods
const PAYMENT_METHODS = {
  ONLINE: 'online',
  PICKUP: 'pickup',
};

// Pickup options
const PICKUP_OPTIONS = {
  ASAP: 'ASAP',
  SCHEDULED: 'scheduled',
};

// Subscription tiers
const SUBSCRIPTION_TIERS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

// Subscription statuses
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
};

// Availability statuses
const AVAILABILITY = {
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
  HIDDEN: 'hidden',
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Error messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  EMAIL_TAKEN: 'Email is already registered',
  
  // Resources
  NOT_FOUND: (resource) => `${resource} not found`,
  ALREADY_EXISTS: (resource) => `${resource} already exists`,
  INVALID_INPUT: 'Invalid input provided',
  
  // Orders
  ORDER_NOT_FOUND: 'Order not found',
  INVALID_STATUS: 'Invalid order status',
  ORDER_PAUSED: 'Restaurant is currently not accepting orders',
  
  // Restaurants
  RESTAURANT_INACTIVE: 'Restaurant is currently inactive',
  SUBDOMAIN_TAKEN: 'Subdomain is already taken',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
};

// Success messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful',
  LOGOUT_SUCCESS: 'Logout successful',
  ORDER_CREATED: 'Order created successfully',
  ORDER_UPDATED: 'Order updated successfully',
  RESOURCE_CREATED: (resource) => `${resource} created successfully`,
  RESOURCE_UPDATED: (resource) => `${resource} updated successfully`,
  RESOURCE_DELETED: (resource) => `${resource} deleted successfully`,
};

module.exports = {
  ORDER_STATUS,
  USER_ROLES,
  PAYMENT_METHODS,
  PICKUP_OPTIONS,
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  AVAILABILITY,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};