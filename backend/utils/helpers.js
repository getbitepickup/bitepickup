const crypto = require('crypto');

/**
 * Generate a unique reference number for orders
 */
const generateOrderReference = () => {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate a slug from a string
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Generate a subdomain from a restaurant name
 */
const generateSubdomain = (restaurantName) => {
  const slug = generateSlug(restaurantName);
  return `${slug}.platform.com`;
};

/**
 * Format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Calculate order totals
 */
const calculateOrderTotals = (items, taxRate = 8.5, serviceFee = 2.50) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount + serviceFee;
  
  return {
    subtotal,
    taxAmount,
    serviceFee,
    total: Math.round(total * 100) / 100,
  };
};

/**
 * Deep clone an object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Get current timestamp in ISO format
 */
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Paginate results
 */
const paginateResults = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = data.slice(startIndex, endIndex);
  
  return {
    results,
    page,
    limit,
    total: data.length,
    pages: Math.ceil(data.length / limit),
  };
};

module.exports = {
  generateOrderReference,
  generateSlug,
  generateSubdomain,
  formatCurrency,
  calculateOrderTotals,
  deepClone,
  getCurrentTimestamp,
  paginateResults,
};