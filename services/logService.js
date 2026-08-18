const AuditLog = require('../models/AuditLog');

/**
 * Log a system event
 * @param {Object} data 
 * @param {string} data.event - Event name (e.g., 'LOGIN_SUCCESS')
 * @param {string} data.message - Descriptive message
 * @param {string} data.category - 'SYSTEM', 'AUTH', 'PAYMENT', 'SUPPORT', 'SECURITY'
 * @param {string} data.severity - 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
 * @param {string} data.user - User ID (optional)
 */
const logEvent = async ({ event, message, category, severity, user }) => {
  try {
    await AuditLog.create({
      event,
      message,
      category: category || 'SYSTEM',
      severity: severity || 'INFO',
      user: user || null
    });
  } catch (error) {
    console.error('Logging failed:', error.message);
  }
};

module.exports = { logEvent };
