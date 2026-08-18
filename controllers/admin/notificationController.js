const User = require('../../models/User');
const Notification = require('../../models/Notification');
const { logEvent } = require('../../services/logService');

// @desc    Send notification to all users
// @route   POST /api/admin/notifications/global
// @access  Private/Admin
const sendGlobalNotification = async (req, res) => {
  try {
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const users = await User.find({ role: 'user' });
    
    const notifications = users.map(user => ({
      user: user._id,
      sender: req.user._id,
      message,
      type: type || 'System'
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({ success: true, message: `Notification sent to ${users.length} users` });

    // Log global notification
    await logEvent({
      event: 'GLOBAL_NOTIFICATION_SENT',
      message: `Global notification sent: ${message.substring(0, 50)}...`,
      category: 'SYSTEM',
      user: req.user._id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send notification to specific user
// @route   POST /api/admin/notifications/direct
// @access  Private/Admin
const sendDirectNotification = async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'User ID and message are required' });
    }

    const notification = await Notification.create({
      user: userId,
      sender: req.user._id,
      message,
      type: type || 'System'
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all notifications (for admin log)
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
      
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Get All Notifications Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendGlobalNotification,
  sendDirectNotification,
  getAllNotifications
};
