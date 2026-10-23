const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../services/notificationService');

/**
 * Get current user's notifications
 */
const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const { notifications, unreadCount } = await getUserNotifications(req.user._id, limit);

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications.',
    });
  }
};

/**
 * Mark a single notification as read
 */
const markSingleRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification.',
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllRead = async (req, res) => {
  try {
    await markAllAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update notifications.',
    });
  }
};

module.exports = {
  getNotifications,
  markSingleRead,
  markAllRead,
};
