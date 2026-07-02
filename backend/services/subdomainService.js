const Restaurant = require('../models/Restaurant');
const { generateSlug } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Service for subdomain-related operations
 */

/**
 * Generate a unique subdomain for a restaurant
 */
const generateSubdomain = async (restaurantName) => {
  const baseSlug = generateSlug(restaurantName);
  let subdomain = `${baseSlug}.platform.com`;
  let counter = 1;

  // Check if subdomain exists, if so append number
  while (true) {
    const existing = await Restaurant.findOne({ subdomain });
    if (!existing) {
      return subdomain;
    }
    subdomain = `${baseSlug}${counter}.platform.com`;
    counter++;
  }
};

/**
 * Generate a unique slug for a restaurant
 */
const generateUniqueSlug = async (restaurantName) => {
  const baseSlug = generateSlug(restaurantName);
  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists, if so append number
  while (true) {
    const existing = await Restaurant.findOne({ slug });
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Validate subdomain format
 */
const isValidSubdomain = (subdomain) => {
  // Must be at least 3 characters, only alphanumeric and hyphens
  const regex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.platform\.com$/;
  return regex.test(subdomain);
};

/**
 * Extract restaurant slug from subdomain
 */
const getSlugFromSubdomain = (subdomain) => {
  return subdomain.replace('.platform.com', '');
};

/**
 * Get restaurant by subdomain
 */
const getRestaurantBySubdomain = async (subdomain) => {
  const restaurant = await Restaurant.findOne({ subdomain });
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  return restaurant;
};

/**
 * Get restaurant by slug
 */
const getRestaurantBySlug = async (slug) => {
  const restaurant = await Restaurant.findOne({ slug });
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  return restaurant;
};

/**
 * Check if subdomain is available
 */
const isSubdomainAvailable = async (subdomain) => {
  const existing = await Restaurant.findOne({ subdomain });
  return !existing;
};

/**
 * Validate and parse subdomain from request
 */
const parseSubdomainFromHost = (host) => {
  if (!host) return null;
  
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];
  
  // Check if it's a subdomain of our platform
  if (!hostWithoutPort.includes('.platform.com')) {
    return null;
  }
  
  return hostWithoutPort;
};

module.exports = {
  generateSubdomain,
  generateUniqueSlug,
  isValidSubdomain,
  getSlugFromSubdomain,
  getRestaurantBySubdomain,
  getRestaurantBySlug,
  isSubdomainAvailable,
  parseSubdomainFromHost,
};