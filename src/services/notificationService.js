const Notification = require('../models/Notification');
const PatientAccess = require('../models/PatientAccess');

/**
 * Creates a notification with optional deduplication.
 */
const createNotification = async ({
  recipient,
  relatedPatient = null,
  type,
  title,
  message,
  priority = 'normal',
  deduplicationKey = null,
  actionLink = '',
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      relatedPatient,
      type,
      title,
      message,
      priority,
      deduplicationKey,
      actionLink,
    });
    return notification;
  } catch (err) {
    if (err.code === 11000) {
      // Deduplicated notification already exists
      return null;
    }
    console.error('[Notification Service Error]', err);
    throw err;
  }
};

/**
 * Notify all authorized care team members (doctors, caregivers) and/or patient of an event.
 */
const notifyCareTeam = async ({
  patientId,
  excludeUserId = null,
  type,
  title,
  message,
  priority = 'normal',
  actionLink = '',
}) => {
  const notifications = [];

  // 1. Notify the patient if not excluded
  if (!excludeUserId || excludeUserId.toString() !== patientId.toString()) {
    const n = await createNotification({
      recipient: patientId,
      relatedPatient: patientId,
      type,
      title,
      message,
      priority,
      actionLink: actionLink || '/patient-dashboard.html',
    });
    if (n) notifications.push(n);
  }

  // 2. Notify all authorized doctors & caregivers
  const accesses = await PatientAccess.find({
    patient: patientId,
    status: 'active',
  });

  for (const access of accesses) {
    if (excludeUserId && access.authorizedUser.toString() === excludeUserId.toString()) {
      continue;
    }

    const targetLink =
      access.role === 'doctor'
        ? '/doctor-dashboard.html'
        : '/caregiver-dashboard.html';

    const n = await createNotification({
      recipient: access.authorizedUser,
      relatedPatient: patientId,
      type,
      title,
      message,
      priority,
      actionLink: targetLink,
    });
    if (n) notifications.push(n);
  }

  return notifications;
};

/**
 * Get notifications for a user with unread counts
 */
const getUserNotifications = async (userId, limit = 50) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('relatedPatient', 'name email'),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return { notifications, unreadCount };
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return updated;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};

module.exports = {
  createNotification,
  notifyCareTeam,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
