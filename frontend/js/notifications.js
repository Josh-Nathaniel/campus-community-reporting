/**
 * NOTIFICATIONS CONTROLLER (notifications.js)
 * Project: Campus Community Reporting System
 * Role: Loads and manages user alerts and status update notifications.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const user = requireAuth();
  if (!user) return;

  renderNavbar("notifications");
  await loadNotifications(user.id);
});

async function loadNotifications(userId) {
  const container = document.getElementById("notifications-container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-block">
      <div class="spinner spinner-dark"></div>
      <p>Loading notifications...</p>
    </div>
  `;

  const response = await apiGet("notifications", { user_id: userId });

  if (!response.success) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <span>Failed to load notifications: ${response.message}</span>
      </div>
    `;
    return;
  }

  const notifs = response.data || [];

  if (notifs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">No notifications yet</div>
        <p>You will receive alerts here when the status of your reports changes or someone posts an update.</p>
      </div>
    `;
    return;
  }

  const itemsHtml = notifs.map(n => {
    const isUnread = !isNotificationRead(n.is_read);
    return `
      <div class="notification-item ${isUnread ? 'unread' : ''}" id="notif-${n.id}">
        <div class="notification-content">
          <div class="notification-text">
            ${isUnread ? '<span style="color: var(--primary); font-size: 0.8rem; font-weight: bold; margin-right: 0.4rem;">● NEW</span>' : ''}
            ${n.message}
          </div>
          <div class="notification-date">${formatDateTime(n.created_at)}</div>
        </div>
        <div>
          ${isUnread ? `
            <button onclick="handleMarkAsRead('${n.id}')" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
              Mark Read
            </button>
          ` : '<span style="font-size: 0.8rem; color: var(--text-light);">Read</span>'}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<div class="card" style="padding: 0;">${itemsHtml}</div>`;
}

function isNotificationRead(val) {
  if (val === true || val === 1) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
}

async function handleMarkAsRead(notifId) {
  const el = document.getElementById(`notif-${notifId}`);
  if (el) {
    el.style.opacity = "0.5";
  }

  const response = await apiPost("markNotificationRead", { notification_id: notifId });

  if (response.success) {
    const user = getCurrentUser();
    if (user) {
      await loadNotifications(user.id);
    }
  } else {
    alert("Failed to mark notification as read: " + response.message);
    if (el) el.style.opacity = "1";
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

