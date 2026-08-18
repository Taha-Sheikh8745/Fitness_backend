const Reminder = require('../models/Reminder');
const { createNotification } = require('../utils/notificationHelper');

const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id }).sort({ datetime: 1 });
    res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createReminder = async (req, res) => {
  try {
    const { title, description, datetime, type } = req.body;
    const reminder = await Reminder.create({
      user: req.user._id, title, description, datetime, type
    });
    
    // Also notify them right away
    await createNotification(
      req.user._id,
      `Reminder set: ${title}`,
      'Reminder'
    );


    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteReminder = async (req, res) => {
  try {
    await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getReminders, createReminder, deleteReminder };
