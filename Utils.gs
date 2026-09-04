/**
 * UTILITY MODULE (Utils.gs)
 * Project: Campus Community Reporting System
 * Role: Provides response helpers, ID generators, and input validators.
 */

// Application salt used for basic password hashing in Apps Script
var PASSWORD_SALT = "CAMPUS_REPORTING_SALT_2026_SECURE!";

/**
 * Creates a standardized JSON response output for Google Apps Script Web App.
 * @param {boolean} success - Operation success flag
 * @param {string} message - Descriptive message
 * @param {any} [data=null] - Payload data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(success, message, data) {
  var payload = {
    success: !!success,
    message: message || (success ? "Operation successful" : "An error occurred"),
    data: data !== undefined ? data : null
  };

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns a standardized success JSON response.
 */
function successResponse(message, data) {
  return jsonResponse(true, message, data);
}

/**
 * Returns a standardized error JSON response.
 */
function errorResponse(message, data) {
  return jsonResponse(false, message, data);
}

/**
 * Generates a unique, timestamp-prefixed ID for database entities.
 * Example outputs: USR-1725350400-A1B2, REP-1725350400-X9Y8
 * @param {string} prefix - Entity prefix ('USR', 'REP', 'COM', 'NOTIF')
 * @returns {string}
 */
function generateId(prefix) {
  var timestamp = new Date().getTime();
  var randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return (prefix ? prefix + "-" : "") + timestamp + "-" + randomSuffix;
}

/**
 * Computes a salted SHA-256 hash of a string using Google Apps Script's native Utilities.
 * @param {string} password - Raw text password
 * @returns {string} Hexadecimal hash string
 */
function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  var combined = password + PASSWORD_SALT;
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
  var hexString = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * Validates whether an email has basic valid formatting.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Strips dangerous HTML tags to mitigate basic stored XSS in text fields.
 * @param {string} str
 * @returns {string}
 */
function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
