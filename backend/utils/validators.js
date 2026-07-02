/**
 * Common validation functions
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (supports various formats)
 */
const isValidPhone = (phone) => {
  // Remove non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Must have between 8 and 15 digits
  return cleaned.length >= 8 && cleaned.length <= 15;
};

/**
 * Validate password strength
 * At least 6 characters, contains at least one letter and one number
 */
const isStrongPassword = (password) => {
  if (password.length < 6) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
};

/**
 * Validate URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate price (positive number with 2 decimal places)
 */
const isValidPrice = (price) => {
  return typeof price === 'number' && price >= 0 && Number.isFinite(price);
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  const regex = /^[0-9a-fA-F]{24}$/;
  return regex.test(id);
};

/**
 * Validate order status
 */
const isValidOrderStatus = (status) => {
  const validStatuses = ['NEW', 'PREPARING', 'READY', 'COMPLETED'];
  return validStatuses.includes(status);
};

/**
 * Validate restaurant role
 */
const isValidUserRole = (role) => {
  const validRoles = ['admin', 'restaurant_owner', 'customer'];
  return validRoles.includes(role);
};

/**
 * Sanitize string (remove HTML tags, trim)
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s\-.,!?'"]/g, ''); // Remove special characters
};

/**
 * Validate pickup time
 */
const isValidPickupTime = (timeOption, scheduledTime) => {
  if (timeOption === 'ASAP') return true;
  if (timeOption === 'scheduled' && scheduledTime) {
    // Validate scheduled time format (e.g., "02:30 PM")
    const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    return regex.test(scheduledTime);
  }
  return false;
};

/**
 * Validate business hours
 */
const isValidBusinessHours = (hours) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (const day of days) {
    if (hours[day]) {
      const { isOpen, openTime, closeTime } = hours[day];
      if (isOpen) {
        if (!openTime || !closeTime) return false;
        // Validate time format (e.g., "09:00 AM")
        const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
        if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) return false;
      }
    }
  }
  return true;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  isValidUrl,
  isValidPrice,
  isValidObjectId,
  isValidOrderStatus,
  isValidUserRole,
  sanitizeString,
  isValidPickupTime,
  isValidBusinessHours,
};