/**
 * STUDENT DASHBOARD LOGIC (dashboard.js)
 * Project: Campus Community Reporting System
 * Role: Loads campus-wide community reports, personal statistics, and recent activity.
 */

let allDashboardReports = [];
let currentDashboardScope = "all"; // "all" | "mine"

document.addEventListener("DOMContentLoaded", async () => {
  const user = requireAuth("student");
  if (!user) return;

  renderNavbar("dashboard");

  // Greet student
  const welcomeEl = document.getElementById("welcome-banner");
  if (welcomeEl) {
    welcomeEl.textContent = `Welcome back, ${user.name}!`;
  }

  await loadStudentDashboard(user);
});

async function loadStudentDashboard(user) {
  const container = document.getElementById("recent-reports-container");
  if (container) {
    container.innerHTML = `
      <div class="loading-block">
        <div class="spinner spinner-dark"></div>
        <p>Loading campus community activity...</p>
      </div>
    `;
  }

  // Fetch campus-wide reports so students can see community metrics and progress
  const response = await apiGet("reports", { role: "student", scope: "all" });

  if (!response.success) {
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger">
          <span>Failed to load reports: ${response.message}</span>
        </div>
      `;
    }
    return;
  }

  allDashboardReports = response.data || [];

  // Calculate campus-wide metrics
  const totalCount = allDashboardReports.length;
  const pendingCount = allDashboardReports.filter(r => r.status === "Pending").length;
  const progressCount = allDashboardReports.filter(r => r.status === "In Progress").length;
  const resolvedCount = allDashboardReports.filter(r => r.status === "Resolved").length;

  // Calculate personal student contribution metrics
  const myReports = allDashboardReports.filter(r => String(r.user_id) === String(user.id));
  const myPending = myReports.filter(r => r.status === "Pending").length;
  const myProgress = myReports.filter(r => r.status === "In Progress").length;
  const myResolved = myReports.filter(r => r.status === "Resolved").length;

  // Update Campus Metrics
  const totalEl = document.getElementById("metric-total");
  const pendingEl = document.getElementById("metric-pending");
  const progressEl = document.getElementById("metric-progress");
  const resolvedEl = document.getElementById("metric-resolved");

  if (totalEl) totalEl.textContent = totalCount;
  if (pendingEl) pendingEl.textContent = pendingCount;
  if (progressEl) progressEl.textContent = progressCount;
  if (resolvedEl) resolvedEl.textContent = resolvedCount;

  // Update Personal Contribution Counters
  const myTotalEl = document.getElementById("metric-my-contribution");
  const myPendingEl = document.getElementById("metric-my-pending");
  const myProgressEl = document.getElementById("metric-my-progress");
  const myResolvedEl = document.getElementById("metric-my-resolved");

  if (myTotalEl) myTotalEl.textContent = `Your reports: ${myReports.length}`;
  if (myPendingEl) myPendingEl.textContent = `Yours: ${myPending}`;
  if (myProgressEl) myProgressEl.textContent = `Yours: ${myProgress}`;
  if (myResolvedEl) myResolvedEl.textContent = `Yours: ${myResolved}`;

  renderRecentReports(user);
}

function switchDashboardScope(scope) {
  currentDashboardScope = scope;
  const user = getCurrentUser();

  const btnAll = document.getElementById("btn-scope-all");
  const btnMine = document.getElementById("btn-scope-mine");
  const titleEl = document.getElementById("recent-card-title");

  if (btnAll) btnAll.classList.toggle("active", scope === "all");
  if (btnMine) btnMine.classList.toggle("active", scope === "mine");

  if (titleEl) {
    titleEl.textContent = scope === "mine" ? "My Recent Submissions" : "Recent Campus Activity";
  }

  renderRecentReports(user);
}

function renderRecentReports(user) {
  const container = document.getElementById("recent-reports-container");
  if (!container) return;

  const filtered = currentDashboardScope === "mine"
    ? allDashboardReports.filter(r => String(r.user_id) === String(user.id))
    : allDashboardReports;

  if (filtered.length === 0) {
    if (currentDashboardScope === "mine") {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">You haven't submitted any reports yet</div>
          <p>Notice a broken facility, equipment problem, or safety hazard on campus?</p>
          <a href="create-report.html" class="btn btn-primary">Submit Your First Report</a>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏛️</div>
          <div class="empty-state-title">No campus reports yet</div>
          <p>Be the first to submit a campus community report.</p>
          <a href="create-report.html" class="btn btn-primary">Submit a Report</a>
        </div>
      `;
    }
    return;
  }

  const recent = filtered.slice(0, 6);
  const rowsHtml = recent.map(r => {
    const isMine = String(r.user_id) === String(user.id);
    const authorDisplay = isMine
      ? `<span>${r.user_name || "You"} <span class="badge badge-you">You</span></span>`
      : `<span>${r.user_name || "Student"}</span>`;

    return `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>
          <a href="report-details.html?id=${r.id}" style="font-weight: 600;">${r.title}</a>
        </td>
        <td><span class="badge badge-category">${r.category}</span></td>
        <td>${getStatusBadge(r.status)}</td>
        <td>${authorDisplay}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(r.created_at)}</td>
        <td>
          <a href="report-details.html?id=${r.id}" class="btn btn-outline btn-sm">View</a>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Reported By</th>
            <th>Date Reported</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

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
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch (e) {
    return String(isoString);
  }
}

