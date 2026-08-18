const Notification = require('../models/Notification');

const createNotification = async (userId, message, type = 'System') => {
  try {
    await Notification.create({
      user: userId,
      message,
      type
    });
  } catch (error) {
    console.error('Failed to create notification', error);
  }
};

const createSystemNotification = async (message, title = 'System Alert') => {
    try {
        // Create a notification for ALL users
        const users = await User.find({}).select('_id');

        if (users.length === 0) return;

        const notifications = users.map(user => ({
            user: user._id,
            message,
            type: 'System',
            title
        }));

        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Failed to create system-wide notification', error);
    }
};

module.exports = { createNotification, createSystemNotification };
