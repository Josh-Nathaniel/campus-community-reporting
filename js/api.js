/**
 * CENTRAL API CLIENT (api.js)
 * Project: Campus Community Reporting System
 * Role: Unified fetch wrapper for communicating with Google Apps Script Web App.
 */

// =============================================================================
// CENTRAL API CONFIGURATION
// When deploying to production or demo, paste your Google Apps Script Web App URL here:
// =============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbw93aJrPZ4J0nUrl9cTeTe4NlLeFELI8ShJFaeC3G8omwVkV5bPNBTFedOtasXGwbpV/exec"; // E.g., "https://script.google.com/macros/s/AKfycb.../exec"

/**
 * Resolves the active API URL (checks hardcoded API_URL first, then localStorage override).
 * @returns {string}
 */
function getApiUrl() {
  return API_URL.trim() || localStorage.getItem("campus_api_url") || "";
}

/**
 * Saves a dynamic API URL override (helpful for testing live deployments directly from UI).
 * @param {string} url
 */
function setApiUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem("campus_api_url", url.trim());
  } else {
    localStorage.removeItem("campus_api_url");
  }
}

/**
 * Tests live connectivity to the Google Apps Script Web App.
 * @param {string} [customUrl]
 * @returns {Promise<{success: boolean, message: string, latency: number}>}
 */
async function testApiConnection(customUrl = null) {
  const url = customUrl || getApiUrl();
  if (!url) {
    return { success: false, message: "No API URL configured. Operating in Local Mock Mode.", latency: 0 };
  }

  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return { success: false, message: `HTTP Error ${response.status}: ${response.statusText}`, latency };
    }

    const data = await response.json();
    if (data && data.success) {
      return { success: true, message: "Connected to Google Apps Script successfully!", latency };
    } else {
      return { success: false, message: data.message || "Endpoint responded but returned an error status.", latency };
    }
  } catch (err) {
    const latency = Date.now() - startTime;
    return { success: false, message: `Network connection failed: ${err.message}`, latency };
  }
}


/**
 * Executes a GET request against the Google Apps Script Web App.
 * @param {string} action - API action name
 * @param {Object} [params={}] - Additional query parameters
 * @returns {Promise<Object>} { success, message, data }
 */
async function apiGet(action, params = {}) {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return handleLocalMockGet(action, params);
  }

  const queryParams = new URLSearchParams({ action, ...params });
  const targetUrl = `${apiUrl}?${queryParams.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API GET Error:", error);
    return {
      success: false,
      message: `Connection Error: ${error.message || "Failed to communicate with campus backend."}`,
      data: null
    };
  }
}

/**
 * Executes a POST request against the Google Apps Script Web App.
 * Sends payload as text/plain;charset=utf-8 to bypass CORS OPTIONS pre-flights.
 * Follows HTTP 302 redirects issued by Google Apps Script.
 * @param {string} action - API action name
 * @param {Object} [payload={}] - Request body data
 * @returns {Promise<Object>} { success, message, data }
 */
async function apiPost(action, payload = {}) {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    return handleLocalMockPost(action, payload);
  }

  const bodyData = { action, ...payload };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(bodyData),
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API POST Error:", error);
    return {
      success: false,
      message: `Connection Error: ${error.message || "Failed to send request to campus backend."}`,
      data: null
    };
  }
}

// =============================================================================
// ZERO-FRICTION LOCAL MOCK ADAPTER (Fallback when Apps Script is not yet connected)
// Allows student team to test all frontend UI flows instantly offline.
// Automatically bypassed the moment an API URL is configured.
// =============================================================================

function initMockStore() {
  if (!localStorage.getItem("mock_users") || JSON.parse(localStorage.getItem("mock_users") || "[]").length < 3) {
    const initialUsers = [
      { id: "USR-ADM-001", name: "Campus Administrator", email: "admin@campus.edu", password: "Admin@123", role: "admin", created_at: new Date().toISOString() },
      { id: "USR-STU-001", name: "Alex Rivera", email: "student@campus.edu", password: "Student@123", role: "student", created_at: new Date().toISOString() },
      { id: "USR-STU-002", name: "Jordan Lee", email: "jordan@campus.edu", password: "Student@123", role: "student", created_at: new Date().toISOString() },
      { id: "USR-STU-003", name: "Taylor Chen", email: "taylor@campus.edu", password: "Student@123", role: "student", created_at: new Date().toISOString() }
    ];
    localStorage.setItem("mock_users", JSON.stringify(initialUsers));
  }

  if (!localStorage.getItem("mock_reports") || JSON.parse(localStorage.getItem("mock_reports") || "[]").length < 5) {
    const initialReports = [
      {
        id: "REP-101",
        user_id: "USR-STU-001",
        user_name: "Alex Rivera",
        title: "Water leak in 3rd Floor Lab",
        description: "Pipe under sink #3 in Room EN-304 is leaking onto the floor.",
        category: "Facilities",
        status: "Pending",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: "REP-102",
        user_id: "USR-STU-001",
        user_name: "Alex Rivera",
        title: "Broken Oscilloscope Bench 4",
        description: "Screen does not power on when plugged in.",
        category: "Equipment",
        status: "In Progress",
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "REP-103",
        user_id: "USR-STU-001",
        user_name: "Alex Rivera",
        title: "Overflowing bin near cafeteria",
        description: "Bin outside south exit is full and attracting pests.",
        category: "Sanitation",
        status: "Resolved",
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: "REP-104",
        user_id: "USR-STU-002",
        user_name: "Jordan Lee",
        title: "Flickering Emergency Exit Light in Library",
        description: "2nd floor stairway exit sign flickers constantly and makes a buzzing sound.",
        category: "Safety",
        status: "Pending",
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: "REP-105",
        user_id: "USR-STU-003",
        user_name: "Taylor Chen",
        title: "Pothole near Student Center Parking Lot B",
        description: "Large pothole in the entrance lane of Parking Lot B causing traffic slowdown.",
        category: "Infrastructure",
        status: "In Progress",
        created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: "REP-106",
        user_id: "USR-STU-002",
        user_name: "Jordan Lee",
        title: "Faulty 3D Printer Extruder in MakerSpace",
        description: "Printer #2 thermal runaway error triggers during warm up.",
        category: "Equipment",
        status: "Resolved",
        created_at: new Date(Date.now() - 3600000 * 60).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
      }
    ];
    localStorage.setItem("mock_reports", JSON.stringify(initialReports));
  }

  if (!localStorage.getItem("mock_comments") || JSON.parse(localStorage.getItem("mock_comments") || "[]").length < 2) {
    const initialComments = [
      {
        id: "COM-201",
        report_id: "REP-102",
        user_id: "USR-ADM-001",
        user_name: "Campus Administrator",
        comment: "Technician dispatched to inspect the fuse on Bench 4.",
        created_at: new Date(Date.now() - 3600000 * 8).toISOString()
      },
      {
        id: "COM-202",
        report_id: "REP-101",
        user_id: "USR-STU-002",
        user_name: "Jordan Lee",
        comment: "I saw this leaking today as well during morning lab. The floor is getting slippery.",
        created_at: new Date(Date.now() - 3600000 * 16).toISOString()
      },
      {
        id: "COM-203",
        report_id: "REP-105",
        user_id: "USR-STU-001",
        user_name: "Alex Rivera",
        comment: "Thanks for reporting this! Almost hit it with my bike yesterday.",
        created_at: new Date(Date.now() - 3600000 * 10).toISOString()
      }
    ];
    localStorage.setItem("mock_comments", JSON.stringify(initialComments));
  }

  if (!localStorage.getItem("mock_notifs")) {
    const initialNotifs = [
      {
        id: "NOTIF-301",
        user_id: "USR-STU-001",
        message: "Your report 'Broken Oscilloscope Bench 4' status was updated to In Progress.",
        is_read: false,
        created_at: new Date().toISOString()
      }
    ];
    localStorage.setItem("mock_notifs", JSON.stringify(initialNotifs));
  }
}

// Simulated mock GET handler
function handleLocalMockGet(action, params) {
  initMockStore();

  if (action === "reports") {
    let reports = JSON.parse(localStorage.getItem("mock_reports") || "[]");
    if (params.scope === "mine" && params.user_id) {
      reports = reports.filter(r => r.user_id === params.user_id);
    }
    return { success: true, message: "Reports loaded (Mock Mode)", data: reports };
  }

  if (action === "report") {
    const reports = JSON.parse(localStorage.getItem("mock_reports") || "[]");
    const comments = JSON.parse(localStorage.getItem("mock_comments") || "[]");
    const target = reports.find(r => r.id === params.id);
    if (!target) return { success: false, message: "Report not found.", data: null };
    const repComments = comments.filter(c => c.report_id === params.id);
    return { success: true, message: "Report details loaded (Mock Mode)", data: { report: target, comments: repComments } };
  }

  if (action === "notifications") {
    const notifs = JSON.parse(localStorage.getItem("mock_notifs") || "[]");
    const userNotifs = notifs.filter(n => n.user_id === params.user_id);
    return { success: true, message: "Notifications loaded (Mock Mode)", data: userNotifs };
  }

  if (action === "users") {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const safeUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at }));
    return { success: true, message: "Users loaded (Mock Mode)", data: safeUsers };
  }

  return { success: false, message: `Mock: Unknown GET action ${action}`, data: null };
}

// Simulated mock POST handler
function handleLocalMockPost(action, payload) {
  initMockStore();

  if (action === "login") {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const user = users.find(u => u.email.toLowerCase() === (payload.email || "").toLowerCase() && u.password === payload.password);
    if (!user) return { success: false, message: "Invalid email or password.", data: null };
    return {
      success: true,
      message: "Login successful (Mock Mode)",
      data: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at }
    };
  }

  if (action === "register") {
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    if (users.some(u => u.email.toLowerCase() === (payload.email || "").toLowerCase())) {
      return { success: false, message: "An account with this email already exists.", data: null };
    }
    const newUser = {
      id: "USR-" + Date.now().toString().slice(-4),
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role || "student",
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem("mock_users", JSON.stringify(users));
    return {
      success: true,
      message: "Registration successful (Mock Mode)",
      data: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, created_at: newUser.created_at }
    };
  }

  if (action === "createReport") {
    const reports = JSON.parse(localStorage.getItem("mock_reports") || "[]");
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const user = users.find(u => u.id === payload.user_id);
    const newReport = {
      id: "REP-" + Date.now().toString().slice(-4),
      user_id: payload.user_id,
      user_name: user ? user.name : "Student Reporter",
      title: payload.title,
      description: payload.description,
      category: payload.category,
      status: "Pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    reports.unshift(newReport);
    localStorage.setItem("mock_reports", JSON.stringify(reports));
    return { success: true, message: "Report submitted successfully (Mock Mode)", data: newReport };
  }

  if (action === "updateReportStatus") {
    const reports = JSON.parse(localStorage.getItem("mock_reports") || "[]");
    const notifs = JSON.parse(localStorage.getItem("mock_notifs") || "[]");
    const target = reports.find(r => r.id === payload.report_id);
    if (!target) return { success: false, message: "Report not found.", data: null };
    target.status = payload.status;
    target.updated_at = new Date().toISOString();
    localStorage.setItem("mock_reports", JSON.stringify(reports));

    // Add mock notification
    notifs.unshift({
      id: "NOTIF-" + Date.now().toString().slice(-4),
      user_id: target.user_id,
      message: `Your report '${target.title}' status was updated to: ${payload.status}`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem("mock_notifs", JSON.stringify(notifs));

    return { success: true, message: "Report status updated (Mock Mode)", data: target };
  }

  if (action === "createComment") {
    const comments = JSON.parse(localStorage.getItem("mock_comments") || "[]");
    const reports = JSON.parse(localStorage.getItem("mock_reports") || "[]");
    const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
    const notifs = JSON.parse(localStorage.getItem("mock_notifs") || "[]");
    const user = users.find(u => u.id === payload.user_id);
    const report = reports.find(r => r.id === payload.report_id);
    const newComment = {
      id: "COM-" + Date.now().toString().slice(-4),
      report_id: payload.report_id,
      user_id: payload.user_id,
      user_name: user ? user.name : "Community Member",
      comment: payload.comment,
      created_at: new Date().toISOString()
    };
    comments.push(newComment);
    localStorage.setItem("mock_comments", JSON.stringify(comments));

    // Notify report author if commenter is not the author
    if (report && String(report.user_id) !== String(payload.user_id)) {
      notifs.unshift({
        id: "NOTIF-" + Date.now().toString().slice(-4),
        user_id: report.user_id,
        message: `${newComment.user_name} commented on your report '${report.title}'.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem("mock_notifs", JSON.stringify(notifs));
    }

    return { success: true, message: "Comment posted (Mock Mode)", data: newComment };
  }

  if (action === "markNotificationRead") {
    const notifs = JSON.parse(localStorage.getItem("mock_notifs") || "[]");
    const target = notifs.find(n => n.id === payload.notification_id);
    if (target) target.is_read = true;
    localStorage.setItem("mock_notifs", JSON.stringify(notifs));
    return { success: true, message: "Notification marked read (Mock Mode)", data: null };
  }

  return { success: false, message: `Mock: Unknown POST action ${action}`, data: null };
}
