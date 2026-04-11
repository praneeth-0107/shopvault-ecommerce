const crypto = require('crypto');

/**
 * Generate a unique ID with a prefix
 * @param {string} prefix - e.g., 'CUS', 'ORD', 'PAY', 'PRD'
 * @returns {string} Unique ID like CUS1712345678abc
 */
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}${timestamp}${random}`.toUpperCase();
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate mobile number (10 digits)
 * @param {string} mobile 
 * @returns {boolean}
 */
function isValidMobile(mobile) {
  const mobileRegex = /^\d{10}$/;
  return mobileRegex.test(mobile);
}

/**
 * Validate password strength (min 6 chars, at least one letter and one number)
 * @param {string} password 
 * @returns {boolean}
 */
function isValidPassword(password) {
  return password && password.length >= 6;
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format currency to INR
 * @param {number} amount 
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

module.exports = { generateId, isValidEmail, isValidMobile, isValidPassword, formatDate, formatCurrency };
