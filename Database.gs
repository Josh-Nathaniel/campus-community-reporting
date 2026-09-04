/**
 * DATABASE LAYER (Database.gs)
 * Project: Campus Community Reporting System
 * Role: Provides basic CRUD operations and concurrency locking for Google Sheets (CampusAppDB).
 */

// Configuration: If running as a standalone Apps Script, paste your Google Sheet ID here.
// If the script is bound (Extensions > Apps Script inside the sheet), leave as empty string ("").
var SPREADSHEET_ID = "";

// Canonical Schemas for all 4 tables
var DB_SCHEMAS = {
  Users: ["id", "name", "email", "password_hash", "role", "created_at"],
  Reports: ["id", "user_id", "title", "description", "category", "status", "created_at", "updated_at"],
  Comments: ["id", "report_id", "user_id", "comment", "created_at"],
  Notifications: ["id", "user_id", "message", "is_read", "created_at"]
};

/**
 * Retrieves the active or configured Google Spreadsheet instance.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error("Spreadsheet not found. Please provide a valid SPREADSHEET_ID in Database.gs.");
}

/**
 * Retrieves a specific sheet by name.
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet '" + sheetName + "' does not exist in CampusAppDB.");
  }
  return sheet;
}

/**
 * Reads all rows from a sheet and maps them into an array of JavaScript objects using Row 1 as keys.
 * @param {string} sheetName
 * @returns {Array<Object>}
 */
function getRowsAsObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol === 0) {
    return []; // Empty sheet or header only
  }

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j]).trim();
      if (headerKey) {
        rowObj[headerKey] = values[i][j];
      }
    }
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Searches a sheet for a row matching a specific ID in column A ('id').
 * @param {string} sheetName
 * @param {string} id
 * @returns {Object|null} { rowNumber: number, data: Object } or null
 */
function findRowById(sheetName, id) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol === 0) {
    return null;
  }

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      var rowObj = {};
      for (var j = 0; j < headers.length; j++) {
        rowObj[String(headers[j]).trim()] = values[i][j];
      }
      return {
        rowNumber: i + 1, // 1-indexed for Sheet API
        data: rowObj
      };
    }
  }

  return null;
}

/**
 * Appends a record to the specified sheet with thread safety via LockService.
 * @param {string} sheetName
 * @param {Object} dataObj
 * @returns {Object} Appended data object
 */
function appendRecord(sheetName, dataObj) {
  var schema = DB_SCHEMAS[sheetName];
  if (!schema) {
    throw new Error("No schema registered for sheet: " + sheetName);
  }

  var rowValues = [];
  for (var i = 0; i < schema.length; i++) {
    var key = schema[i];
    var val = dataObj[key];
    rowValues.push(val !== undefined && val !== null ? val : "");
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds for concurrent write locks
    var sheet = getSheet(sheetName);
    sheet.appendRow(rowValues);
    SpreadsheetApp.flush(); // Commit data immediately
    return dataObj;
  } catch (err) {
    throw new Error("Database write locked or timed out: " + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Updates specific fields of an existing row matching an ID with thread safety.
 * @param {string} sheetName
 * @param {string} id
 * @param {Object} updatesObj
 * @returns {boolean}
 */
function updateRecordById(sheetName, id, updatesObj) {
  var schema = DB_SCHEMAS[sheetName];
  if (!schema) {
    throw new Error("No schema registered for sheet: " + sheetName);
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var target = findRowById(sheetName, id);
    if (!target) {
      throw new Error("Record with ID '" + id + "' not found in " + sheetName + ".");
    }

    var sheet = getSheet(sheetName);
    var rowNum = target.rowNumber;

    // Update only specified fields that exist in the schema
    for (var i = 0; i < schema.length; i++) {
      var fieldName = schema[i];
      if (updatesObj.hasOwnProperty(fieldName)) {
        var colNum = i + 1; // 1-indexed column
        sheet.getRange(rowNum, colNum).setValue(updatesObj[fieldName]);
      }
    }

    SpreadsheetApp.flush();
    return true;
  } catch (err) {
    throw new Error("Database update error: " + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Automated Database Setup & Initializer Helper
 * Can be run manually by the student team in the Apps Script editor to initialize sheets & headers.
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  var sheetNames = Object.keys(DB_SCHEMAS);

  for (var s = 0; s < sheetNames.length; s++) {
    var name = sheetNames[s];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    // Set headers in Row 1 if empty
    if (sheet.getLastRow() === 0) {
      var headers = DB_SCHEMAS[name];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }

  Logger.log("CampusAppDB sheets initialized successfully: " + sheetNames.join(", "));
  return "Database setup completed successfully!";
}
