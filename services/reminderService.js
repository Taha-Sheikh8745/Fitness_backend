const User = require('../models/User');
const Workout = require('../models/Workout');
const Habit = require('../models/Habit');
const sendEmail = require('../utils/emailService');

/**
 * Send daily workout and hydration reminder emails.
 */
const runDailyReminderAudit = async () => {
  const users = await User.find({ isVerified: true });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const user of users) {
    const workoutToday = await Workout.findOne({ user: user._id, date: { $gte: today } });

    if (!workoutToday) {
      await sendEmail({
        email: user.email,
        subject: "FitForge AI - Don't miss your workout!",
        message: `Hi ${user.name}, we noticed you haven't logged a workout today. Consistency is key!`,
        html: `<h1>Time to sweat!</h1><p>Hi ${user.name}, keep your streak alive by logging a workout today.</p>`,
      });
    }

    const waterToday = await Habit.findOne({ user: user._id, type: 'Water', date: today });
    if (!waterToday || waterToday.currentValue < waterToday.target) {
      await sendEmail({
        email: user.email,
        subject: 'FitForge AI - Stay Hydrated!',
        message: `Hi ${user.name}, you haven't reached your water goal for today. Drink up!`,
        html: `<p>Don't forget to hydrate, ${user.name}!</p>`,
      });
    }
  }
};

module.exports = { runDailyReminderAudit };
