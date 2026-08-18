const cron = require('node-cron');
const { runDailyReminderAudit } = require('../services/reminderService');

/**
 * Background worker to send retention reminders (local development only).
 */
const initReminderWorker = () => {
  if (process.env.VERCEL) {
    return;
  }

  cron.schedule('0 20 * * *', async () => {
    console.log('Running daily reminder audit...');

    try {
      await runDailyReminderAudit();
      console.log('Reminder audit completed successfully.');
    } catch (error) {
      console.error('Reminder worker error:', error);
    }
  });
};

module.exports = { initReminderWorker };
