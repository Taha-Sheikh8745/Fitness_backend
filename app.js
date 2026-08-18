require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const { runDailyReminderAudit } = require('./services/reminderService');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'http://localhost:5173',
  'http://localhost:5001',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001',
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    try {
      const { hostname } = new URL(origin);
      if (hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch {
      // Ignore invalid origin URLs
    }

    return callback(null, true);
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'FitForge API is running' });
});

app.get('/api/cron/reminders', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await runDailyReminderAudit();
    res.status(200).json({ success: true, message: 'Reminder audit completed' });
  } catch (error) {
    console.error('Cron reminder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/workouts', require('./routes/workoutRoutes'));
app.use('/api/nutrition', require('./routes/nutritionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/habits', require('./routes/habitRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(errorHandler);

module.exports = app;
