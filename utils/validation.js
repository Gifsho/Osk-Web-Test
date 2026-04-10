/**
 * @fileoverview SOSK Extension – Runtime Validation Utilities
 * Provides strict input/message validation following .vscoderules (SOLID, DRY, no Zod CDN due to CSP).
 */

'use strict';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok - Whether validation passed
 * @property {string|null} error - Error message if validation failed, otherwise null
 */

/**
 * @typedef {Object} EncryptedPayload
 * @property {string} iv - Base64-encoded IV
 * @property {string} data - Base64-encoded ciphertext
 */

/**
 * @typedef {Object} KeyActionData
 * @property {string} action - The action type
 * @property {string|{enc: EncryptedPayload}} [key] - Key value or encrypted payload
 */

/**
 * @typedef {Object} RuntimeMessage
 * @property {string} action - The message action identifier
 * @property {string} [status] - Optional status value ("on" | "off")
 * @property {string|{enc: EncryptedPayload}} [key] - Optional key value
 */

/** @type {string[]} Valid keyboard status values */
const VALID_STATUSES = ['on', 'off'];

/** @type {string[]} Valid runtime message actions */
const VALID_ACTIONS = [
  'SOSK-MINI',
  'typeKey',
  'backspace',
  'Enter',
  'esc',
  'del⌦',
  'home',
  'end',
  '←',
  '→',
  'keyboardStatus',
  'getKeyboardStatus',
  'setKeyboardStatus',
  'contentScriptReady',
  'ping',
];

/**
 * Checks whether a value is a non-empty string.
 * @param {*} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks whether a value is a plain object (not null, not array).
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates a Base64 string format (rough check, non-empty).
 * @param {*} value
 * @returns {boolean}
 */
function isBase64(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return btoa(atob(value)) === value || value.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates an encrypted payload object { iv, data }.
 * @param {*} payload
 * @returns {ValidationResult}
 */
function validateEncryptedPayload(payload) {
  if (!isPlainObject(payload)) {
    return { ok: false, error: 'Encrypted payload must be an object' };
  }
  if (!isBase64(payload.iv)) {
    return { ok: false, error: 'Encrypted payload missing valid iv (Base64)' };
  }
  if (!isBase64(payload.data)) {
    return { ok: false, error: 'Encrypted payload missing valid data (Base64)' };
  }
  return { ok: true, error: null };
}

/**
 * Validates a chrome.runtime message object.
 * @param {*} message - The raw message received
 * @returns {ValidationResult}
 */
function validateMessage(message) {
  if (!isPlainObject(message)) {
    return { ok: false, error: 'Message must be a plain object' };
  }
  if (!isNonEmptyString(message.action)) {
    return { ok: false, error: 'Message must have a non-empty "action" string' };
  }
  if (!VALID_ACTIONS.includes(message.action)) {
    return { ok: false, error: `Unknown action: "${message.action}"` };
  }
  // Validate status if present
  if ('status' in message && !VALID_STATUSES.includes(message.status)) {
    return { ok: false, error: `Invalid status value: "${message.status}"` };
  }
  return { ok: true, error: null };
}

/**
 * Validates a keyboard key value (plain string OR encrypted object).
 * @param {*} key - The key value to validate
 * @returns {ValidationResult}
 */
function validateKey(key) {
  if (key === null || key === undefined) {
    return { ok: false, error: 'Key value is required' };
  }
  // Plain string key
  if (typeof key === 'string') {
    return { ok: true, error: null };
  }
  // Encrypted key: { enc: { iv, data } }
  if (isPlainObject(key) && isPlainObject(key.enc)) {
    return validateEncryptedPayload(key.enc);
  }
  return { ok: false, error: 'Key must be a string or encrypted object { enc: { iv, data } }' };
}

/**
 * Validates data retrieved from chrome.storage.
 * @param {*} data - The storage data object
 * @param {string[]} requiredKeys - List of required top-level keys
 * @returns {ValidationResult}
 */
function validateStorageData(data, requiredKeys) {
  if (!isPlainObject(data)) {
    return { ok: false, error: 'Storage data must be a plain object' };
  }
  for (const key of requiredKeys) {
    if (!(key in data) || data[key] === undefined || data[key] === null) {
      return { ok: false, error: `Storage data missing required key: "${key}"` };
    }
  }
  return { ok: true, error: null };
}

/**
 * Validates a keyboard position string.
 * @param {*} position
 * @returns {ValidationResult}
 */
function validateKeyboardPosition(position) {
  const VALID_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
  if (!VALID_POSITIONS.includes(position)) {
    return { ok: false, error: `Invalid keyboard position: "${position}". Must be one of: ${VALID_POSITIONS.join(', ')}` };
  }
  return { ok: true, error: null };
}

/**
 * Validates a postMessage event from the keyboard iframe.
 * @param {MessageEvent} event
 * @returns {ValidationResult}
 */
function validateIframeMessage(event) {
  if (!event || !isPlainObject(event.data)) {
    return { ok: false, error: 'Invalid postMessage event' };
  }
  const { data } = event;
  if (!isNonEmptyString(data.source)) {
    return { ok: false, error: 'postMessage data missing "source" field' };
  }
  return { ok: true, error: null };
}

// Export for use in service worker and content scripts (via global or module)
if (typeof window !== 'undefined') {
  window.SOSKValidation = {
    validateMessage,
    validateKey,
    validateStorageData,
    validateKeyboardPosition,
    validateIframeMessage,
    validateEncryptedPayload,
  };
} else if (typeof self !== 'undefined') {
  // Service worker context
  self.SOSKValidation = {
    validateMessage,
    validateKey,
    validateStorageData,
    validateKeyboardPosition,
    validateIframeMessage,
    validateEncryptedPayload,
  };
}
