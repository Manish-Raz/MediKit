/**
 * MediKit Notification Center Logic
 */

const SAMPLE_NOTIFICATIONS = [
  {
    _id: '671900000000000000000031',
    title: 'Missed Dose Alert: Evening Schedule',
    message: 'Yesterday 8:00 PM dose of Metformin was marked as missed. Please check your schedule or record a skip reason.',
    type: 'dose_missed',
    priority: 'high',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionLink: '/patient-dashboard.html',
  },
  {
    _id: '671900000000000000000032',
    title: 'New Prescription Added: Lisinopril 10mg',
    message: 'Dr. Sarah Jenkins added Lisinopril 10mg once daily to your medication schedule.',
    type: 'prescription_new',
    priority: 'normal',
    isRead: false,
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    actionLink: '/prescriptions.html',
  },
  {
    _id: '671900000000000000000033',
    title: 'Adherence Milestone Reached',
    message: 'Great work! You maintained 83% medication adherence over the past 30 days.',
    type: 'system',
    priority: 'normal',
    isRead: true,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    actionLink: '/patient-dashboard.html',
  },
  {
    _id: '671900000000000000000034',
    title: 'Caregiver Authorization Active',
    message: 'Emily Doe (Daughter) was granted dose logging permissions.',
    type: 'access_granted',
    priority: 'normal',
    isRead: true,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    actionLink: '/profile.html',
  },
];

let currentUser = null;
let allNotifications = [];

async function initNotificationsPage() {
  currentUser = await Auth.checkAuth();
  UI.initSidebar(currentUser, 'notifications');
  UI.initTopbar(currentUser, 'Notification Center & Adherence Alerts');

  await loadNotifications();
  setupEventListeners();
  UI.playPageAnimations();
}

async function loadNotifications() {
  try {
    const res = await API.get('/notifications?limit=100');
    if (res.success && res.notifications && res.notifications.length > 0) {
      allNotifications = res.notifications;
    } else {
      // No notifications returned; show empty list
      allNotifications = [];
    }
  } catch (err) {
    console.log('Using sample notifications.');
    allNotifications = [];
  }
  renderNotificationsList(allNotifications);
}

function renderNotificationsList(notifications) {
  const container = document.getElementById('notifications-list-container');
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="bell" style="width: 32px; height: 32px;"></i></div>
        <h3>No Notifications</h3>
        <p>You have no recent alerts or reminders.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = notifications
    .map((n) => {
      const isUnread = !n.isRead;
      const typeIcon =
        n.type === 'dose_missed' || n.type === 'adherence_alert'
          ? 'alert-triangle'
          : n.type === 'dose_reminder'
          ? 'clock'
          : n.type === 'prescription_new' || n.type === 'prescription_modified'
          ? 'file-text'
          : 'info';

      const iconColor =
        n.priority === 'urgent'
          ? 'var(--status-missed)'
          : n.priority === 'high'
          ? 'var(--status-skipped)'
          : 'var(--primary-teal)';

      return `
        <div class="card" style="padding: 16px 20px; margin-bottom: 12px; background: ${isUnread ? '#f0fdfa' : 'white'}; border-left: 4px solid ${isUnread ? 'var(--primary-teal)' : 'var(--border-light)'}; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
          <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div style="color: ${iconColor}; margin-top: 2px;">
              <i data-lucide="${typeIcon}" style="width: 22px; height: 22px;"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="color: var(--primary-navy); font-size: 0.95rem;">${n.title}</strong>
                ${isUnread ? '<span class="badge badge-verified" style="font-size: 0.7rem; padding: 2px 6px;">New</span>' : ''}
              </div>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${n.message}</p>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">
                ${new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
            ${n.actionLink ? `<a href="${n.actionLink}" class="btn btn-sm btn-secondary">Open</a>` : ''}
            ${isUnread ? `<button class="btn btn-sm btn-outline" onclick="markOneRead('${n._id}')">Mark Read</button>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

async function markOneRead(notifId) {
  try {
    await API.patch(`/notifications/${notifId}/read`);
  } catch (err) {
    // Local fallback update
  }
  const item = allNotifications.find((n) => n._id === notifId);
  if (item) item.isRead = true;
  renderNotificationsList(allNotifications);
  UI.showToast('Notification marked as read.', 'success');
}

async function markAllNotificationsRead() {
  try {
    await API.patch('/notifications/read-all');
  } catch (err) {
    // Local fallback
  }
  allNotifications.forEach((n) => (n.isRead = true));
  renderNotificationsList(allNotifications);
  UI.showToast('All notifications marked as read.', 'success');
  const badge = document.getElementById('topbar-badge');
  if (badge) badge.style.display = 'none';
}

function setupEventListeners() {
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) markAllBtn.addEventListener('click', markAllNotificationsRead);

  const filterSelect = document.getElementById('notifications-filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'unread') {
        renderNotificationsList(allNotifications.filter((n) => !n.isRead));
      } else {
        renderNotificationsList(allNotifications);
      }
    });
  }
}

window.initNotificationsPage = initNotificationsPage;
window.markOneRead = markOneRead;
window.markAllNotificationsRead = markAllNotificationsRead;
