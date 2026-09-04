/**
 * REPORTS & NOTIFICATIONS MODULE (Reports.gs)
 * Project: Campus Community Reporting System
 * Role: Manages report submissions, lifecycle status changes, comments, and in-app alerts.
 */

var VALID_CATEGORIES = ["Facilities", "Equipment", "Sanitation", "Safety", "Infrastructure", "Other"];
var VALID_STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];

/**
 * Creates a user map ({ id: name }) for enriching entities with author names.
 * @returns {Object}
 */
function buildUserMap() {
  var users = getRowsAsObjects("Users");
  var map = {};
  for (var i = 0; i < users.length; i++) {
    map[users[i].id] = users[i].name;
  }
  return map;
}

/**
 * Creates a new incident report.
 * @param {Object} data - { user_id, title, description, category }
 * @returns {Object} Created report object
 */
function handleCreateReport(data) {
  if (!data) throw new Error("Report payload is required.");

  var userId = String(data.user_id || "").trim();
  var title = String(data.title || "").trim();
  var description = String(data.description || "").trim();
  var category = String(data.category || "").trim();

  // Validate inputs
  if (!userId) throw new Error("User ID is required.");
  if (!title || title.length < 3) throw new Error("Title must be at least 3 characters long.");
  if (title.length > 100) throw new Error("Title cannot exceed 100 characters.");
  if (!description || description.length < 5) throw new Error("Description must be at least 5 characters long.");
  var matchedCategory = null;
  for (var c = 0; c < VALID_CATEGORIES.length; c++) {
    if (VALID_CATEGORIES[c].toLowerCase() === category.toLowerCase()) {
      matchedCategory = VALID_CATEGORIES[c];
      break;
    }
  }
  if (!matchedCategory) {
    throw new Error("Invalid category. Must be one of: " + VALID_CATEGORIES.join(", "));
  }
  category = matchedCategory;

  // Verify submitting user exists
  var userLookup = findRowById("Users", userId);
  if (!userLookup) {
    throw new Error("Invalid user account.");
  }

  var reportId = generateId("REP");
  var now = new Date().toISOString();

  var newReport = {
    id: reportId,
    user_id: userId,
    title: sanitizeInput(title),
    description: sanitizeInput(description),
    category: category,
    status: "Pending",
    created_at: now,
    updated_at: now
  };

  appendRecord("Reports", newReport);
  newReport.user_name = userLookup.data.name;

  return newReport;
}

/**
 * Retrieves reports.
 * If scope is "mine" and userId is provided, filters to that user's reports.
 * Otherwise returns all reports across the campus community enriched with author user_name.
 * @param {string} [userId] - Optional user filter
 * @param {string} [role] - User role ('student' | 'admin')
 * @param {string} [scope] - Scope ('mine' | 'all')
 * @returns {Array<Object>}
 */
function handleGetReports(userId, role, scope) {
  var allReports = getRowsAsObjects("Reports");
  var userMap = buildUserMap();
  var filtered = [];

  for (var i = 0; i < allReports.length; i++) {
    var r = allReports[i];
    // Filter to user's reports only if scope === "mine"
    if (scope === "mine" && userId && String(r.user_id) !== String(userId)) {
      continue;
    }
    r.user_name = userMap[r.user_id] || "Unknown User";
    filtered.push(r);
  }

  // Sort descending by created_at (newest first)
  filtered.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return filtered;
}

/**
 * Retrieves a single report by ID along with its comment thread.
 * @param {string} reportId
 * @returns {Object} { report, comments }
 */
function handleGetReportById(reportId) {
  if (!reportId) throw new Error("Report ID is required.");

  var target = findRowById("Reports", reportId);
  if (!target) {
    throw new Error("Report not found: " + reportId);
  }

  var userMap = buildUserMap();
  var reportData = target.data;
  reportData.user_name = userMap[reportData.user_id] || "Unknown User";

  // Fetch comments for this report
  var allComments = getRowsAsObjects("Comments");
  var reportComments = [];

  for (var i = 0; i < allComments.length; i++) {
    var c = allComments[i];
    if (String(c.report_id) === String(reportId)) {
      c.user_name = userMap[c.user_id] || "Unknown User";
      reportComments.push(c);
    }
  }

  // Sort comments ascending (oldest first, like a conversation)
  reportComments.sort(function(a, b) {
    return new Date(a.created_at) - new Date(b.created_at);
  });

  return {
    report: reportData,
    comments: reportComments
  };
}

/**
 * Updates a report's status (Admin only) and triggers an automatic in-app notification.
 * @param {Object} data - { report_id, status, admin_id }
 * @returns {Object}
 */
function handleUpdateReportStatus(data) {
  if (!data) throw new Error("Update payload is required.");

  var reportId = String(data.report_id || "").trim();
  var status = String(data.status || "").trim();
  var adminId = String(data.admin_id || "").trim();

  if (!reportId || !status || !adminId) {
    throw new Error("report_id, status, and admin_id are required.");
  }

  var matchedStatus = null;
  for (var s = 0; s < VALID_STATUSES.length; s++) {
    if (VALID_STATUSES[s].toLowerCase() === status.toLowerCase()) {
      matchedStatus = VALID_STATUSES[s];
      break;
    }
  }
  if (!matchedStatus) {
    throw new Error("Invalid status. Allowed: " + VALID_STATUSES.join(", "));
  }
  status = matchedStatus;

  // Verify admin authorization
  var adminLookup = findRowById("Users", adminId);
  if (!adminLookup || adminLookup.data.role !== "admin") {
    throw new Error("Unauthorized: Only administrators can update report statuses.");
  }

  var reportLookup = findRowById("Reports", reportId);
  if (!reportLookup) {
    throw new Error("Report not found: " + reportId);
  }

  var now = new Date().toISOString();
  updateRecordById("Reports", reportId, {
    status: status,
    updated_at: now
  });

  // Automatically dispatch notification to the student author
  var reportAuthorId = reportLookup.data.user_id;
  var notifMessage = "Your report '" + reportLookup.data.title + "' status was updated to: " + status;

  handleCreateNotification({
    user_id: reportAuthorId,
    message: notifMessage
  });

  return {
    id: reportId,
    status: status,
    updated_at: now
  };
}

/**
 * Appends a comment to a report discussion thread.
 * @param {Object} data - { report_id, user_id, comment }
 * @returns {Object} Created comment object
 */
function handleAddComment(data) {
  if (!data) throw new Error("Comment payload is required.");

  var reportId = String(data.report_id || "").trim();
  var userId = String(data.user_id || "").trim();
  var commentText = String(data.comment || "").trim();

  if (!reportId || !userId || !commentText) {
    throw new Error("report_id, user_id, and comment text are required.");
  }

  // Verify report and user exist
  var reportLookup = findRowById("Reports", reportId);
  if (!reportLookup) throw new Error("Report not found.");

  var userLookup = findRowById("Users", userId);
  if (!userLookup) throw new Error("User not found.");

  var commentId = generateId("COM");
  var now = new Date().toISOString();

  var newComment = {
    id: commentId,
    report_id: reportId,
    user_id: userId,
    comment: sanitizeInput(commentText),
    created_at: now
  };

  appendRecord("Comments", newComment);
  newComment.user_name = userLookup.data.name;

  // If someone other than the author comments (e.g. an admin), notify author
  if (String(reportLookup.data.user_id) !== String(userId)) {
    handleCreateNotification({
      user_id: reportLookup.data.user_id,
      message: userLookup.data.name + " commented on your report '" + reportLookup.data.title + "'."
    });
  }

  return newComment;
}

/**
 * Creates an in-app notification record.
 * @param {Object} data - { user_id, message }
 * @returns {Object}
 */
function handleCreateNotification(data) {
  var userId = String(data.user_id || "").trim();
  var message = String(data.message || "").trim();

  if (!userId || !message) {
    throw new Error("user_id and message are required for notification.");
  }

  var notifId = generateId("NOTIF");
  var newNotif = {
    id: notifId,
    user_id: userId,
    message: sanitizeInput(message),
    is_read: false,
    created_at: new Date().toISOString()
  };

  appendRecord("Notifications", newNotif);
  return newNotif;
}

/**
 * Retrieves notifications for a specific user.
 * @param {string} userId
 * @returns {Array<Object>}
 */
function handleGetNotifications(userId) {
  if (!userId) throw new Error("User ID is required.");

  var allNotifs = getRowsAsObjects("Notifications");
  var userNotifs = [];

  for (var i = 0; i < allNotifs.length; i++) {
    if (String(allNotifs[i].user_id) === String(userId)) {
      userNotifs.push(allNotifs[i]);
    }
  }

  // Sort descending (newest first)
  userNotifs.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return userNotifs;
}

/**
 * Marks a notification as read.
 * @param {Object} data - { notification_id }
 * @returns {boolean}
 */
function handleMarkNotificationRead(data) {
  var notifId = String(data.notification_id || "").trim();
  if (!notifId) throw new Error("notification_id is required.");

  updateRecordById("Notifications", notifId, {
    is_read: true
  });

  return true;
}
