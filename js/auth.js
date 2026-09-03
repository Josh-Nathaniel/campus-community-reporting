/**
 * AUTHENTICATION & SESSION GUARDS (auth.js)
 * Project: Campus Community Reporting System
 * Role: Client-side session management, route protection, and dynamic navbar rendering.
 */

const STORAGE_KEY = "campus_user";

/**
 * Retrieves the currently logged-in user profile from localStorage.
 * @returns {Object|null}
 */
function getCurrentUser() {
  const userJson = localStorage.getItem(STORAGE_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Persists the user profile upon successful login or registration.
 * @param {Object} user
 */
function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Clears the user session.
 */
function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks if an active session exists.
 * @returns {boolean}
 */
function isAuthenticated() {
  return getCurrentUser() !== null;
}

/**
 * Route protection guard for authenticated views.
 * Redirects unauthenticated users to login.html.
 * Enforces role boundaries (e.g. students cannot access admin pages).
 * @param {string} [requiredRole] - 'student' | 'admin' | null
 * @returns {Object} current user
 */
function requireAuth(requiredRole = null) {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    if (user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "dashboard.html";
    }
    return null;
  }

  return user;
}

/**
 * Redirects logged-in users away from guest pages (login.html, register.html).
 */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user) {
    if (user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "dashboard.html";
    }
  }
}

/**
 * Handles user logout action.
 */
function handleLogout() {
  clearCurrentUser();
  window.location.href = "login.html";
}

/**
 * Dynamically renders the standardized campus navigation bar into #main-header.
 * Prevents HTML code duplication across all 11 application views.
 * @param {string} activePage - Identifier of current page
 */
function renderNavbar(activePage = "") {
  const headerContainer = document.getElementById("main-header");
  if (!headerContainer) return;

  const user = getCurrentUser();
  const isLoggedIn = user !== null;
  const isAdmin = isLoggedIn && user.role === "admin";

  let linksHtml = "";

  if (!isLoggedIn) {
    linksHtml = `
      <li><a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a></li>
      <li><a href="login.html" class="nav-link ${activePage === 'login' ? 'active' : ''}">Sign In</a></li>
      <li><a href="register.html" class="btn btn-primary btn-sm">Register</a></li>
    `;
  } else if (isAdmin) {
    linksHtml = `
      <li><a href="admin-dashboard.html" class="nav-link ${activePage === 'admin-dashboard' ? 'active' : ''}">Dashboard</a></li>
      <li><a href="admin-reports.html" class="nav-link ${activePage === 'admin-reports' ? 'active' : ''}">All Reports</a></li>
      <li><a href="admin-users.html" class="nav-link ${activePage === 'admin-users' ? 'active' : ''}">User Directory</a></li>
      <li><a href="notifications.html" class="nav-link ${activePage === 'notifications' ? 'active' : ''}">Notifications</a></li>
    `;
  } else {
    // Student Links
    linksHtml = `
      <li><a href="dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
      <li><a href="reports.html" class="nav-link ${activePage === 'reports' ? 'active' : ''}">My Reports</a></li>
      <li><a href="create-report.html" class="nav-link ${activePage === 'create-report' ? 'active' : ''}">Submit Report</a></li>
      <li><a href="notifications.html" class="nav-link ${activePage === 'notifications' ? 'active' : ''}">Notifications</a></li>
    `;
  }

  let userSectionHtml = "";
  if (isLoggedIn) {
    userSectionHtml = `
      <div class="nav-user">
        <div class="nav-user-info">
          <div class="nav-user-name">${user.name}</div>
          <div class="nav-user-role">${user.role === 'admin' ? '🛡️ Administrator' : '🎓 Student'}</div>
        </div>
        <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
      </div>
    `;
  }

  headerContainer.innerHTML = `
    <nav class="navbar">
      <div class="container nav-container">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="${isLoggedIn ? (isAdmin ? 'admin-dashboard.html' : 'dashboard.html') : 'index.html'}" class="nav-brand">
            <span>🏛️ Campus Reporting</span>
            <span class="nav-brand-badge">${isAdmin ? 'ADMIN' : 'COMMUNITY'}</span>
          </a>
          <span id="api-status-pill" onclick="openApiModal()" style="cursor: pointer; font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: var(--radius-full); font-weight: 600; border: 1px solid var(--border); background: var(--surface-subtle); color: var(--text-muted);" title="Click to inspect/configure backend Google Apps Script connection">
            🔌 API: <span id="api-status-label">${getApiUrl() ? 'Live Cloud' : 'Local Mock'}</span>
          </span>
        </div>
        <ul class="nav-links">
          ${linksHtml}
        </ul>
        ${userSectionHtml}
      </div>
    </nav>
  `;
}

/**
 * Renders and opens the API Connection Settings Modal.
 */
function openApiModal() {
  let modal = document.getElementById("api-config-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "api-config-modal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "1000";
    document.body.appendChild(modal);
  }

  const currentUrl = getApiUrl();

  modal.innerHTML = `
    <div class="card" style="width: 90%; max-width: 540px; margin: 0; box-shadow: var(--shadow-lg);">
      <div class="card-header">
        <h3 class="card-title">🔌 Google Apps Script API Connection</h3>
        <button onclick="closeApiModal()" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>

      <p style="font-size: 0.9rem;">
        Connect this frontend to your deployed Google Apps Script Web App URL, or test locally in offline mock mode.
      </p>

      <div class="form-group">
        <label class="form-label" for="modal-api-url">Web App URL</label>
        <input type="text" id="modal-api-url" class="form-control" placeholder="https://script.google.com/macros/s/.../exec" value="${currentUrl}">
        <small style="color: var(--text-muted); font-size: 0.78rem;">Must end with <code>/exec</code> and have access set to "Anyone".</small>
      </div>

      <div id="modal-api-feedback" style="margin-bottom: 1rem;"></div>

      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
        <button onclick="handleModalTestConnection()" id="modal-test-btn" class="btn btn-outline btn-sm">Test Connection</button>
        <button onclick="handleModalUseMock()" class="btn btn-outline btn-sm">Reset to Mock</button>
        <button onclick="handleModalSaveUrl()" class="btn btn-primary btn-sm">Save & Apply</button>
      </div>
    </div>
  `;
  modal.style.display = "flex";
}

function closeApiModal() {
  const modal = document.getElementById("api-config-modal");
  if (modal) modal.style.display = "none";
}

async function handleModalTestConnection() {
  const inputUrl = document.getElementById("modal-api-url").value.trim();
  const feedback = document.getElementById("modal-api-feedback");
  const testBtn = document.getElementById("modal-test-btn");

  if (!inputUrl) {
    feedback.innerHTML = '<div class="alert alert-info" style="padding: 0.6rem 1rem;">No URL entered. Operating in local mock mode.</div>';
    return;
  }

  testBtn.disabled = true;
  testBtn.innerHTML = '<span class="spinner"></span> Testing...';
  feedback.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted);">Pinging Google Apps Script endpoint...</div>';

  const result = await testApiConnection(inputUrl);

  testBtn.disabled = false;
  testBtn.innerHTML = "Test Connection";

  if (result.success) {
    feedback.innerHTML = `<div class="alert alert-success" style="padding: 0.6rem 1rem;">${result.message} (${result.latency}ms response)</div>`;
  } else {
    feedback.innerHTML = `<div class="alert alert-danger" style="padding: 0.6rem 1rem;">${result.message}</div>`;
  }
}

function handleModalSaveUrl() {
  const inputUrl = document.getElementById("modal-api-url").value.trim();
  setApiUrl(inputUrl);
  closeApiModal();
  window.location.reload();
}

function handleModalUseMock() {
  setApiUrl("");
  closeApiModal();
  window.location.reload();
}

