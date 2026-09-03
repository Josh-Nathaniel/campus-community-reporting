/**
 * STUDENT DASHBOARD LOGIC (dashboard.js)
 * Project: Campus Community Reporting System
 * Role: Loads personal report statistics and recent submissions for the student portal.
 */

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
        <p>Loading your campus activity...</p>
      </div>
    `;
  }

  const response = await apiGet("reports", { user_id: user.id, role: "student" });

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

  const reports = response.data || [];

  // Calculate metrics
  const totalCount = reports.length;
  const pendingCount = reports.filter(r => r.status === "Pending").length;
  const progressCount = reports.filter(r => r.status === "In Progress").length;
  const resolvedCount = reports.filter(r => r.status === "Resolved").length;

  document.getElementById("metric-total").textContent = totalCount;
  document.getElementById("metric-pending").textContent = pendingCount;
  document.getElementById("metric-progress").textContent = progressCount;
  document.getElementById("metric-resolved").textContent = resolvedCount;

  // Render recent reports (up to 5)
  if (!container) return;

  if (reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No reports submitted yet</div>
        <p>Notice a broken facility, equipment problem, or safety hazard on campus?</p>
        <a href="create-report.html" class="btn btn-primary">Submit Your First Report</a>
      </div>
    `;
    return;
  }

  const recent = reports.slice(0, 5);
  const rowsHtml = recent.map(r => `
    <tr>
      <td><strong>#${r.id}</strong></td>
      <td>
        <a href="report-details.html?id=${r.id}" style="font-weight: 600;">${r.title}</a>
      </td>
      <td><span class="badge badge-category">${r.category}</span></td>
      <td>${getStatusBadge(r.status)}</td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(r.created_at)}</td>
      <td>
        <a href="report-details.html?id=${r.id}" class="btn btn-outline btn-sm">View</a>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
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

