/**
 * MAIN ENTRYPOINT & ROUTER (Code.gs)
 * Project: Campus Community Reporting System
 * Role: Web App request dispatcher handling HTTP GET and POST requests.
 */

/**
 * HTTP GET handler for reading data from the reporting system.
 * Supported Query Parameters:
 *   ?action=reports [&user_id=USER_ID] [&role=student|admin]
 *   ?action=report &id=REPORT_ID
 *   ?action=notifications &user_id=USER_ID
 *   ?action=users &admin_id=ADMIN_USER_ID
 * @param {Object} e - Event parameter containing query parameters
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action;

    if (!action) {
      return successResponse("Campus Community Reporting API is active. Ready to receive requests.", {
        status: "online",
        timestamp: new Date().toISOString()
      });
    }

    switch (action) {
      case "reports":
        var reportsList = handleGetReports(params.user_id, params.role, params.scope);
        return successResponse("Reports retrieved successfully", reportsList);

      case "report":
        var reportDetails = handleGetReportById(params.id);
        return successResponse("Report details retrieved successfully", reportDetails);

      case "notifications":
        var notificationsList = handleGetNotifications(params.user_id);
        return successResponse("Notifications retrieved successfully", notificationsList);

      case "users":
        var usersList = handleGetUsers(params.admin_id);
        return successResponse("Users retrieved successfully", usersList);

      default:
        return errorResponse("Unrecognized GET action: '" + action + "'");
    }
  } catch (err) {
    return errorResponse(err.message || "An unexpected error occurred during GET processing.");
  }
}

/**
 * HTTP POST handler for state-mutating requests (Registration, Login, Reports, Comments, Status Updates).
 * Accepts JSON strings via Content-Type: text/plain;charset=utf-8 to bypass CORS OPTIONS pre-flights.
 * @param {Object} e - Event parameter containing postData
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse("Empty request body. JSON payload is required.");
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return errorResponse("Malformed JSON payload: " + parseErr.message);
    }

    var action = payload.action;
    if (!action) {
      return errorResponse("Missing required field: 'action' in request payload.");
    }

    switch (action) {
      case "register":
        var registeredUser = handleRegister(payload);
        return successResponse("Account registered successfully.", registeredUser);

      case "login":
        var authenticatedUser = handleLogin(payload);
        return successResponse("Login successful.", authenticatedUser);

      case "createReport":
        var createdReport = handleCreateReport(payload);
        return successResponse("Report submitted successfully.", createdReport);

      case "updateReportStatus":
        var updatedReport = handleUpdateReportStatus(payload);
        return successResponse("Report status updated successfully.", updatedReport);

      case "createComment":
        var addedComment = handleAddComment(payload);
        return successResponse("Comment posted successfully.", addedComment);

      case "createNotification":
        var createdNotif = handleCreateNotification(payload);
        return successResponse("Notification created successfully.", createdNotif);

      case "markNotificationRead":
        handleMarkNotificationRead(payload);
        return successResponse("Notification marked as read.", { id: payload.notification_id });

      default:
        return errorResponse("Unrecognized POST action: '" + action + "'");
    }
  } catch (err) {
    return errorResponse(err.message || "An unexpected error occurred during POST processing.");
  }
}
