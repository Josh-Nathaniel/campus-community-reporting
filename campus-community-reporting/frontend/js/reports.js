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
  const photoInput = document.getElementById("report-photo");
  const photoPreviewContainer = document.getElementById("photo-preview-container");
  const photoLabelText = document.getElementById("photo-label-text");

  let selectedPhotoFile = null;

  if (!form) return;

  // Handle Photo Selection
  if (photoInput) {
    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showAlert(alertEl, "Please choose a valid image file (JPG, PNG, WebP).", "danger");
        photoInput.value = "";
        return;
      }

      selectedPhotoFile = file;
      const previewUrl = URL.createObjectURL(file);

      photoPreviewContainer.innerHTML = `
        <div class="photo-preview-card">
          <img src="${previewUrl}" alt="Photo Preview">
          <button type="button" class="btn-remove-photo" id="btn-remove-photo" title="Remove photo">&times;</button>
          <span class="photo-preview-badge">Ready to upload</span>
        </div>
      `;
      photoPreviewContainer.style.display = "block";
      if (photoLabelText) photoLabelText.textContent = "Change photo";

      // Attach remove handler
      const removeBtn = document.getElementById("btn-remove-photo");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          selectedPhotoFile = null;
          photoInput.value = "";
          photoPreviewContainer.innerHTML = "";
          photoPreviewContainer.style.display = "none";
          if (photoLabelText) photoLabelText.textContent = "Select photo from device";
          URL.revokeObjectURL(previewUrl);
        });
      }
    });
  }

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

    let imageUrl = "";

    // Upload photo if selected
    if (selectedPhotoFile) {
      submitBtn.innerHTML = '<span class="spinner"></span> Optimizing & uploading photo...';
      try {
        const compressedBlob = await compressImage(selectedPhotoFile);
        const uploadResult = await uploadImageToStorage(compressedBlob, "reports");

        if (!uploadResult.success) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Submit Report";
          showAlert(alertEl, uploadResult.message || "Failed to upload photo. Please try again.", "danger");
          return;
        }

        imageUrl = uploadResult.url || "";
      } catch (uploadErr) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit Report";
        showAlert(alertEl, "Photo processing error: " + uploadErr.message, "danger");
        return;
      }
    }

    submitBtn.innerHTML = '<span class="spinner"></span> Submitting report...';

    const response = await apiPost("createReport", {
      user_id: user.id,
      title: title,
      category: category,
      description: description,
      image_url: imageUrl
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
// STUDENT CAMPUS & COMMUNITY REPORTS LIST VIEW (reports.html)
// =============================================================================
async function initReportsListPage() {
  const user = requireAuth("student");
  if (!user) return;
  renderNavbar("reports");

  const filterScope = document.getElementById("filter-scope");
  const filterStatus = document.getElementById("filter-status");
  const filterCategory = document.getElementById("filter-category");
  const filterSearch = document.getElementById("filter-search");

  if (filterScope) filterScope.addEventListener("change", applyReportFilters);
  if (filterStatus) filterStatus.addEventListener("change", applyReportFilters);
  if (filterCategory) filterCategory.addEventListener("change", applyReportFilters);
  if (filterSearch) filterSearch.addEventListener("input", applyReportFilters);

  await loadStudentReports(user.id);
}

async function loadStudentReports(userId) {
  const container = document.getElementById("reports-table-container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Fetching campus community reports...</p>
    </div>
  `;

  // Fetch all reports across campus
  const response = await apiGet("reports", { role: "student", scope: "all" });

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
  const user = getCurrentUser();
  const scopeVal = document.getElementById("filter-scope") ? document.getElementById("filter-scope").value : "all";
  const statusVal = document.getElementById("filter-status") ? document.getElementById("filter-status").value : "";
  const catVal = document.getElementById("filter-category") ? document.getElementById("filter-category").value : "";
  const searchVal = document.getElementById("filter-search") ? document.getElementById("filter-search").value.trim().toLowerCase() : "";
  const container = document.getElementById("reports-table-container");

  let filtered = allLoadedReports;

  // Scope filter (All campus reports vs My reports only)
  if (scopeVal === "mine" && user) {
    filtered = filtered.filter(r => String(r.user_id) === String(user.id));
  }

  // Status filter
  if (statusVal) {
    filtered = filtered.filter(r => r.status === statusVal);
  }

  // Category filter
  if (catVal) {
    filtered = filtered.filter(r => r.category === catVal);
  }

  // Search keyword filter (title, description, or author name)
  if (searchVal) {
    filtered = filtered.filter(r => {
      const titleMatch = (r.title || "").toLowerCase().includes(searchVal);
      const descMatch = (r.description || "").toLowerCase().includes(searchVal);
      const authorMatch = (r.user_name || "").toLowerCase().includes(searchVal);
      const idMatch = (r.id || "").toLowerCase().includes(searchVal);
      return titleMatch || descMatch || authorMatch || idMatch;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No matching reports found</div>
        <p>Try adjusting your search query, scope, or filters.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = filtered.map(r => {
    const isMine = user && String(r.user_id) === String(user.id);
    const authorDisplay = isMine
      ? `<span>${r.user_name || "You"} <span class="badge badge-you">You</span></span>`
      : `<span>${r.user_name || "Student"}</span>`;

    return `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>
          <a href="report-details.html?id=${r.id}" style="font-weight: 600;">${r.title}</a>
          ${r.image_url ? '<span class="badge-has-photo" title="Photo attached">📷</span>' : ''}
        </td>
        <td><span class="badge badge-category">${r.category}</span></td>
        <td>${getStatusBadge(r.status)}</td>
        <td>${authorDisplay}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(r.created_at)}</td>
        <td>
          <a href="report-details.html?id=${r.id}" class="btn btn-outline btn-sm">Details</a>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Reported By</th>
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
  const isMine = String(report.user_id) === String(user.id);

  // Render Report Header and Body
  container.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <a href="${user.role === 'admin' ? 'admin-reports.html' : 'reports.html'}" class="btn btn-outline btn-sm">
        ← Back to ${user.role === 'admin' ? 'All Reports' : 'Campus Reports'}
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
        <div><strong>Submitted By:</strong> <span>${report.user_name || "Student"} ${isMine ? '<span class="badge badge-you">You</span>' : ''}</span></div>
        <div><strong>Submitted Date:</strong> ${formatDateTime(report.created_at)}</div>
        <div><strong>Last Updated:</strong> ${formatDateTime(report.updated_at)}</div>
      </div>

      <div style="background-color: var(--surface-subtle); border-radius: var(--radius-sm); padding: 1.25rem; border: 1px solid var(--border);">
        <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Incident Description</h4>
        <p style="white-space: pre-wrap; margin-bottom: 0; color: var(--text-main);">${report.description}</p>
      </div>

      ${report.image_url ? `
        <div class="report-photo-section">
          <div class="report-photo-title">Attached Photo:</div>
          <div class="report-photo-wrapper" onclick="openPhotoLightbox('${report.image_url}')" title="Click to view full photo">
            <img src="${report.image_url}" alt="Report Photo" loading="lazy">
            <div class="report-photo-overlay">🔍 Click to zoom</div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Community Discussion Thread Section -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">💬 Community Discussion & Updates</h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${(comments || []).length} comments</span>
      </div>

      <div id="comments-list">
        ${renderCommentsList(comments, report, user)}
      </div>

      <!-- Add Comment Form (open to any student or admin) -->
      <form id="add-comment-form" style="margin-top: 1.5rem;">
        <div class="form-group">
          <label class="form-label" for="comment-text">Add a comment or community note:</label>
          <textarea id="comment-text" class="form-control" placeholder="Share an update, confirm you noticed this issue, or add details..." style="min-height: 80px;" required></textarea>
        </div>
        <div class="form-group" style="margin-bottom: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <label for="comment-photo" class="photo-input-label" style="font-size: 0.85rem; padding: 0.35rem 0.75rem; margin: 0;">
              <span>📷</span> <span id="comment-photo-text">Attach photo</span>
            </label>
            <input type="file" id="comment-photo" accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;">
            <div id="comment-photo-preview" style="display: none;"></div>
          </div>
        </div>
        <div id="comment-alert"></div>
        <button type="submit" id="comment-submit-btn" class="btn btn-primary btn-sm">Post Comment</button>
      </form>
    </div>
  `;

  // Attach comment photo selection listener
  const commentPhotoInput = document.getElementById("comment-photo");
  const commentPhotoPreview = document.getElementById("comment-photo-preview");
  const commentPhotoText = document.getElementById("comment-photo-text");
  let selectedCommentPhoto = null;

  if (commentPhotoInput) {
    commentPhotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        const commentAlert = document.getElementById("comment-alert");
        showAlert(commentAlert, "Please select an image file (JPG, PNG, WebP).", "danger");
        commentPhotoInput.value = "";
        return;
      }

      selectedCommentPhoto = file;
      const previewUrl = URL.createObjectURL(file);
      commentPhotoPreview.innerHTML = `
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--surface); border: 1px solid var(--border); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.8rem;">
          <img src="${previewUrl}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px;">
          <span>Photo attached</span>
          <button type="button" id="btn-remove-comment-photo" style="background: none; border: none; cursor: pointer; color: var(--danger); font-weight: bold;">&times;</button>
        </div>
      `;
      commentPhotoPreview.style.display = "inline-block";
      if (commentPhotoText) commentPhotoText.textContent = "Change photo";

      const removeBtn = document.getElementById("btn-remove-comment-photo");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          selectedCommentPhoto = null;
          commentPhotoInput.value = "";
          commentPhotoPreview.innerHTML = "";
          commentPhotoPreview.style.display = "none";
          if (commentPhotoText) commentPhotoText.textContent = "Attach photo";
          URL.revokeObjectURL(previewUrl);
        });
      }
    });
  }

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

    let commentImageUrl = "";
    if (selectedCommentPhoto) {
      commentBtn.innerHTML = '<span class="spinner"></span> Uploading photo...';
      try {
        const compressedBlob = await compressImage(selectedCommentPhoto, 1000, 1000, 0.8);
        const uploadRes = await uploadImageToStorage(compressedBlob, "comments");
        if (!uploadRes.success) {
          commentBtn.disabled = false;
          commentBtn.innerHTML = "Post Comment";
          showAlert(commentAlert, uploadRes.message || "Failed to upload attached photo.", "danger");
          return;
        }
        commentImageUrl = uploadRes.url || "";
      } catch (err) {
        commentBtn.disabled = false;
        commentBtn.innerHTML = "Post Comment";
        showAlert(commentAlert, "Photo compression error: " + err.message, "danger");
        return;
      }
    }

    commentBtn.innerHTML = '<span class="spinner"></span> Posting...';

    const res = await apiPost("createComment", {
      report_id: report.id,
      user_id: user.id,
      comment: text,
      image_url: commentImageUrl
    });

    commentBtn.disabled = false;
    commentBtn.innerHTML = "Post Comment";

    if (res.success) {
      commentInput.value = "";
      selectedCommentPhoto = null;
      if (commentPhotoInput) commentPhotoInput.value = "";
      if (commentPhotoPreview) {
        commentPhotoPreview.innerHTML = "";
        commentPhotoPreview.style.display = "none";
      }
      // Refresh report view to display new comment
      await loadReportDetails(report.id, user);
    } else {
      showAlert(commentAlert, res.message || "Failed to post comment.", "danger");
    }
  });
}

function renderCommentsList(comments, report, currentUser) {
  if (!comments || comments.length === 0) {
    return `
      <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.9rem;">
        No comments yet. Be the first to add a note or follow-up below.
      </div>
    `;
  }

  return comments.map(c => {
    let badges = "";
    if (report && String(c.user_id) === String(report.user_id)) {
      badges += `<span class="badge badge-author">Author</span>`;
    }
    if ((c.user_name && c.user_name.toLowerCase().includes("admin")) || c.role === "admin") {
      badges += `<span class="badge badge-admin-role">Admin</span>`;
    }
    if (currentUser && String(c.user_id) === String(currentUser.id)) {
      badges += `<span class="badge badge-you">You</span>`;
    }

    return `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-author">👤 ${c.user_name || "Community Member"} ${badges}</span>
          <span class="comment-time">${formatDateTime(c.created_at)}</span>
        </div>
        <div class="comment-body">${c.comment}</div>
        ${c.image_url ? `
          <div class="comment-attached-photo" onclick="openPhotoLightbox('${c.image_url}')" title="Click to view photo">
            <img src="${c.image_url}" alt="Comment Attachment" loading="lazy">
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

/**
 * Opens photo lightbox modal for fullscreen inspection.
 * @param {string} imageUrl
 */
function openPhotoLightbox(imageUrl) {
  if (!imageUrl) return;
  let lightbox = document.getElementById("photo-lightbox-modal");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "photo-lightbox-modal";
    lightbox.className = "image-lightbox";
    lightbox.innerHTML = `
      <button type="button" class="image-lightbox-close" onclick="closePhotoLightbox()">&times;</button>
      <img class="image-lightbox-img" src="" alt="Expanded Photo">
    `;
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closePhotoLightbox();
    });
    document.body.appendChild(lightbox);
  }

  const img = lightbox.querySelector(".image-lightbox-img");
  img.src = imageUrl;
  lightbox.classList.add("active");
}

/**
 * Closes the photo lightbox modal.
 */
function closePhotoLightbox() {
  const lightbox = document.getElementById("photo-lightbox-modal");
  if (lightbox) {
    lightbox.classList.remove("active");
  }
}

// Close lightbox on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePhotoLightbox();
});

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

