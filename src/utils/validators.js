/**
 * Validation and security sanitization utilities.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely parse JSON with error handling.
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    return fallback;
  }
}

/**
 * Validates a normalized security event.
 */
export function validateSecurityEvent(event) {
  const errors = [];
  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a valid object'] };
  }

  if (!event.eventId) errors.push('Missing eventId');
  if (!event.timestamp) errors.push('Missing timestamp');
  else if (isNaN(new Date(event.timestamp).getTime())) errors.push('Invalid timestamp format');

  if (!event.source) errors.push('Missing source');
  if (!event.eventType) errors.push('Missing eventType');
  if (!event.action) errors.push('Missing action');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a synthetic cloud configuration object.
 */
export function validateCloudConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be a JSON object'] };
  }

  if (!config.cloudProvider) errors.push('Missing cloudProvider (e.g. AWS, Azure, GCP)');
  if (!Array.isArray(config.resources)) {
    errors.push('Config must contain a "resources" array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
