/**
 * ADMIN CONTROLLER (admin.js)
 * Project: Campus Community Reporting System
 * Role: Handles admin dashboard metrics, report status triage, and user management directory.
 */

let allAdminReports = [];

// =============================================================================
// ADMIN DASHBOARD VIEW (admin-dashboard.html)
// =============================================================================
async function initAdminDashboard() {
  const admin = requireAuth("admin");
  if (!admin) return;
  renderNavbar("admin-dashboard");

  const welcomeEl = document.getElementById("admin-welcome");
  if (welcomeEl) {
    welcomeEl.textContent = `Administrator Control Center — ${admin.name}`;
  }

  await loadAdminMetrics();
}

async function loadAdminMetrics() {
  const admin = getCurrentUser();
  const response = await apiGet("reports", { role: "admin" });

  if (!response.success) {
    alert("Failed to load admin metrics: " + response.message);
    return;
  }

  const reports = response.data || [];
  allAdminReports = reports;

  const total = reports.length;
  const pending = reports.filter(r => r.status === "Pending").length;
  const progress = reports.filter(r => r.status === "In Progress").length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const rejected = reports.filter(r => r.status === "Rejected").length;

  if (document.getElementById("admin-metric-total")) document.getElementById("admin-metric-total").textContent = total;
  if (document.getElementById("admin-metric-pending")) document.getElementById("admin-metric-pending").textContent = pending;
  if (document.getElementById("admin-metric-progress")) document.getElementById("admin-metric-progress").textContent = progress;
  if (document.getElementById("admin-metric-resolved")) document.getElementById("admin-metric-resolved").textContent = resolved;
  if (document.getElementById("admin-metric-rejected")) document.getElementById("admin-metric-rejected").textContent = rejected;

  // Render recent 5 pending or progress reports in urgent queue
  const urgentQueueContainer = document.getElementById("admin-urgent-queue");
  if (urgentQueueContainer) {
    const urgent = reports.filter(r => r.status === "Pending" || r.status === "In Progress").slice(0, 5);
    if (urgent.length === 0) {
      urgentQueueContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <div class="empty-state-title">No pending tickets</div>
          <p>All submitted campus issues have been processed or resolved!</p>
        </div>
      `;
    } else {
      urgentQueueContainer.innerHTML = renderAdminTableRows(urgent, false);
    }
  }
}

// =============================================================================
// ADMIN ALL REPORTS TRIAGE VIEW (admin-reports.html)
// =============================================================================
async function initAdminReportsPage() {
  const admin = requireAuth("admin");
  if (!admin) return;
  renderNavbar("admin-reports");

  const filterStatus = document.getElementById("admin-filter-status");
  const filterCategory = document.getElementById("admin-filter-category");

  if (filterStatus) filterStatus.addEventListener("change", applyAdminFilters);
  if (filterCategory) filterCategory.addEventListener("change", applyAdminFilters);

  await loadAllAdminReports();
}

async function loadAllAdminReports() {
  const container = document.getElementById("admin-reports-table-container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Loading all campus reports...</p>
    </div>
  `;

  const response = await apiGet("reports", { role: "admin" });

  if (!response.success) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <span>Failed to fetch campus reports: ${response.message}</span>
      </div>
    `;
    return;
  }

  allAdminReports = response.data || [];
  applyAdminFilters();
}

function applyAdminFilters() {
  const statusVal = document.getElementById("admin-filter-status") ? document.getElementById("admin-filter-status").value : "";
  const catVal = document.getElementById("admin-filter-category") ? document.getElementById("admin-filter-category").value : "";
  const container = document.getElementById("admin-reports-table-container");

  let filtered = allAdminReports;
  if (statusVal) {
    filtered = filtered.filter(r => r.status === statusVal);
  }
  if (catVal) {
    filtered = filtered.filter(r => r.category === catVal);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No reports match the selected filters</div>
        <p>Try resetting the category or status filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Reporter</th>
            <th>Category</th>
            <th>Current Status</th>
            <th>Change Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${renderAdminTableRows(filtered, true)}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminTableRows(reports, showStatusChanger = true) {
  if (!reports || reports.length === 0) {
    return '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No reports found matching criteria.</td></tr>';
  }
  return reports.map(r => `
    <tr>
      <td><strong>#${r.id}</strong></td>
      <td>
        <a href="report-details.html?id=${r.id}" style="font-weight: 600;">${r.title}</a>
      </td>
      <td>${r.user_name || "Student"}</td>
      <td><span class="badge badge-category">${r.category}</span></td>
      <td>${getStatusBadge(r.status)}</td>
      ${showStatusChanger ? `
        <td>
          <select class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; width: auto;" onchange="handleStatusChange('${r.id}', this.value)">
            <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
      ` : ''}
      <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(r.created_at)}</td>
      <td>
        <a href="report-details.html?id=${r.id}" class="btn btn-outline btn-sm">Inspect</a>
      </td>
    </tr>
  `).join("");
}

async function handleStatusChange(reportId, newStatus) {
  const admin = getCurrentUser();
  if (!admin || admin.role !== "admin") {
    alert("Unauthorized operation.");
    return;
  }

  const response = await apiPost("updateReportStatus", {
    report_id: reportId,
    status: newStatus,
    admin_id: admin.id
  });

  if (response.success) {
    // Update local cache
    const target = allAdminReports.find(r => r.id === reportId);
    if (target) {
      target.status = newStatus;
    }
    applyAdminFilters();
  } else {
    alert("Failed to update status: " + response.message);
    applyAdminFilters(); // Reset select dropdown
  }
}

// =============================================================================
// ADMIN USER MANAGEMENT VIEW (admin-users.html)
// =============================================================================
async function initAdminUsersPage() {
  const admin = requireAuth("admin");
  if (!admin) return;
  renderNavbar("admin-users");

  const container = document.getElementById("admin-users-table-container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Loading registered campus users...</p>
    </div>
  `;

  const response = await apiGet("users", { admin_id: admin.id });

  if (!response.success) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <span>Failed to load users: ${response.message}</span>
      </div>
    `;
    return;
  }

  const users = response.data || [];

  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No registered users found</div>
      </div>
    `;
    return;
  }

  const rowsHtml = users.map(u => `
    <tr>
      <td><strong>#${u.id}</strong></td>
      <td style="font-weight: 600;">${u.name}</td>
      <td>${u.email}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-in-progress' : 'badge-category'}">
          ${u.role === 'admin' ? '🛡️ Administrator' : '🎓 Student'}
        </span>
      </td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(u.created_at)}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Full Name</th>
            <th>Email Address</th>
            <th>Role</th>
            <th>Registration Date</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

// Helpers
function getStatusBadge(status) {
  switch (status) {
    case "Pending":
      return '<span class="badge badge-pending">⏳ Pending</span>';
    case "In Progress":
      return '<span class="badge badge-in-progress">🔧 In Progress</span>';
    case "Resolved":
      return '<span class="badge badge-resolved">✅ Resolved</span>';
    case "Rejected":
      return '<span class="badge badge-rejected">❌ Rejected</span>';
    default:
      return `<span class="badge">${status}</span>`;
  }
}

function formatDate(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return String(isoString);
  }
}

