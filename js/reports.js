/**
 * REPORT CONTROLLER (reports.js)
 * Project: Campus Community Reporting System
 * Role: Handles report creation, student reports listing, ticket details, and comment threads.
 */

let allLoadedReports = [];

// =============================================================================
// REPORT CREATION VIEW (create-report.html)
// =============================================================================
function initCreateReportPage() {
  const user = requireAuth("student");
  if (!user) return;
  renderNavbar("create-report");

  const form = document.getElementById("create-report-form");
  const alertEl = document.getElementById("form-alert");
  const submitBtn = document.getElementById("submit-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertEl.innerHTML = "";

    const title = document.getElementById("report-title").value.trim();
    const category = document.getElementById("report-category").value;
    const description = document.getElementById("report-desc").value.trim();

    // Validation
    if (title.length < 3) {
      showAlert(alertEl, "Title must be at least 3 characters long.", "danger");
      return;
    }
    if (!category) {
      showAlert(alertEl, "Please select an appropriate issue category.", "danger");
      return;
    }
    if (description.length < 5) {
      showAlert(alertEl, "Description must be at least 5 characters long.", "danger");
      return;
    }

    // Submit state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

    const response = await apiPost("createReport", {
      user_id: user.id,
      title: title,
      category: category,
      description: description
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = "Submit Report";

    if (response.success) {
      showAlert(alertEl, "Report submitted successfully! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "reports.html";
      }, 1000);
    } else {
      showAlert(alertEl, response.message || "Failed to submit report. Please try again.", "danger");
    }
  });
}

// =============================================================================
// STUDENT MY REPORTS LIST VIEW (reports.html)
// =============================================================================
async function initReportsListPage() {
  const user = requireAuth("student");
  if (!user) return;
  renderNavbar("reports");

  const filterStatus = document.getElementById("filter-status");
  const filterCategory = document.getElementById("filter-category");

  if (filterStatus) filterStatus.addEventListener("change", applyReportFilters);
  if (filterCategory) filterCategory.addEventListener("change", applyReportFilters);

  await loadStudentReports(user.id);
}

async function loadStudentReports(userId) {
  const container = document.getElementById("reports-table-container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Fetching your reports...</p>
    </div>
  `;

  const response = await apiGet("reports", { user_id: userId, role: "student" });

  if (!response.success) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <span>Failed to load reports: ${response.message}</span>
      </div>
    `;
    return;
  }

  allLoadedReports = response.data || [];
  applyReportFilters();
}

function applyReportFilters() {
  const statusVal = document.getElementById("filter-status") ? document.getElementById("filter-status").value : "";
  const catVal = document.getElementById("filter-category") ? document.getElementById("filter-category").value : "";
  const container = document.getElementById("reports-table-container");

  let filtered = allLoadedReports;
  if (statusVal) {
    filtered = filtered.filter(r => r.status === statusVal);
  }
  if (catVal) {
    filtered = filtered.filter(r => r.category === catVal);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No matching reports found</div>
        <p>Try adjusting your category or status filter.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = filtered.map(r => `
    <tr>
      <td><strong>#${r.id}</strong></td>
      <td>
        <a href="report-details.html?id=${r.id}" style="font-weight: 600;">${r.title}</a>
      </td>
      <td><span class="badge badge-category">${r.category}</span></td>
      <td>${getStatusBadge(r.status)}</td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(r.created_at)}</td>
      <td>
        <a href="report-details.html?id=${r.id}" class="btn btn-outline btn-sm">Details</a>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Submitted</th>
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

// =============================================================================
// REPORT DETAILS & COMMENTS VIEW (report-details.html)
// =============================================================================
async function initReportDetailsPage() {
  const user = requireAuth();
  if (!user) return;
  renderNavbar(user.role === "admin" ? "admin-reports" : "reports");

  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");

  if (!reportId) {
    document.getElementById("report-details-container").innerHTML = `
      <div class="alert alert-danger">Missing report ID in URL.</div>
    `;
    return;
  }

  await loadReportDetails(reportId, user);
}

async function loadReportDetails(reportId, user) {
  const container = document.getElementById("report-details-container");
  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Loading ticket details...</p>
    </div>
  `;

  const response = await apiGet("report", { id: reportId });

  if (!response.success || !response.data) {
    container.innerHTML = `
      <div class="alert alert-danger">
        ${response.message || "Failed to find the specified report."}
      </div>
      <a href="${user.role === 'admin' ? 'admin-reports.html' : 'reports.html'}" class="btn btn-outline btn-sm">← Back to Reports</a>
    `;
    return;
  }

  const { report, comments } = response.data;

  // Render Report Header and Body
  container.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <a href="${user.role === 'admin' ? 'admin-reports.html' : 'reports.html'}" class="btn btn-outline btn-sm">
        ← Back to ${user.role === 'admin' ? 'All Reports' : 'My Reports'}
      </a>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">TICKET #${report.id}</span>
          <h2 style="margin-top: 0.25rem;">${report.title}</h2>
        </div>
        <div>
          ${getStatusBadge(report.status)}
        </div>
      </div>

      <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-muted);">
        <div><strong>Category:</strong> <span class="badge badge-category">${report.category}</span></div>
        <div><strong>Submitted By:</strong> ${report.user_name || "Student"}</div>
        <div><strong>Submitted Date:</strong> ${formatDateTime(report.created_at)}</div>
        <div><strong>Last Updated:</strong> ${formatDateTime(report.updated_at)}</div>
      </div>

      <div style="background-color: var(--surface-subtle); border-radius: var(--radius-sm); padding: 1.25rem; border: 1px solid var(--border);">
        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Incident Description</h4>
        <p style="white-space: pre-wrap; margin-bottom: 0; color: var(--text-main);">${report.description}</p>
      </div>
    </div>

    <!-- Discussion Thread Section -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">💬 Discussion & Updates</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${(comments || []).length} comments</span>
      </div>

      <div id="comments-list">
        ${renderCommentsList(comments)}
      </div>

      <!-- Add Comment Form -->
      <form id="add-comment-form" style="margin-top: 1.5rem;">
        <div class="form-group">
          <label class="form-label" for="comment-text">Add a comment or follow-up:</label>
          <textarea id="comment-text" class="form-control" placeholder="Type your comment or update here..." style="min-height: 80px;" required></textarea>
        </div>
        <div id="comment-alert"></div>
        <button type="submit" id="comment-submit-btn" class="btn btn-primary btn-sm">Post Comment</button>
      </form>
    </div>
  `;

  // Attach comment submit listener
  const commentForm = document.getElementById("add-comment-form");
  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const commentInput = document.getElementById("comment-text");
    const commentBtn = document.getElementById("comment-submit-btn");
    const commentAlert = document.getElementById("comment-alert");

    const text = commentInput.value.trim();
    if (!text) return;

    commentBtn.disabled = true;
    commentBtn.innerHTML = '<span class="spinner"></span> Posting...';

    const res = await apiPost("createComment", {
      report_id: report.id,
      user_id: user.id,
      comment: text
    });

    commentBtn.disabled = false;
    commentBtn.innerHTML = "Post Comment";

    if (res.success) {
      commentInput.value = "";
      // Refresh report view
      await loadReportDetails(report.id, user);
    } else {
      showAlert(commentAlert, res.message || "Failed to post comment.", "danger");
    }
  });
}

function renderCommentsList(comments) {
  if (!comments || comments.length === 0) {
    return `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
        No comments yet. Post the first update below.
      </div>
    `;
  }

  return comments.map(c => `
    <div class="comment-item">
      <div class="comment-meta">
        <span class="comment-author">👤 ${c.user_name || "Community Member"}</span>
        <span class="comment-time">${formatDateTime(c.created_at)}</span>
      </div>
      <div class="comment-body">${c.comment}</div>
    </div>
  `).join("");
}

// Helpers
function showAlert(el, msg, type = "info") {
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
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
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return String(isoString);
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    return String(isoString);
  }
}

