const Workout = require('../../models/Workout');
const User = require('../../models/User');
const Nutrition = require('../../models/Nutrition');

// @desc    Get system-wide analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });

    // 1. Workout Category Distribution
    const workoutDistribution = await Workout.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);

    // 2. User Growth (Last 6 months)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          users: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', users: 1, _id: 0 } }
    ]);

    // 3. Nutrition Averages
    const macros = await Nutrition.aggregate([
      {
        $group: {
          _id: null,
          avgProtein: { $avg: '$protein' },
          avgCarbs: { $avg: '$carbs' },
          avgFats: { $avg: '$fats' }
        }
      }
    ]);

    // 4. Activity Pulse (Events per day for last 7 days)
    const activityPulse = await Workout.aggregate([
      {
        $match: {
          date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { day: '$_id', sessions: 1, _id: 0 } }
    ]);

    // 5. Active User Sync Rate (Last 7 days)
    const activeUsersCount = await User.countDocuments({ 
      role: 'user',
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const syncRate = totalUsers > 0 ? ((activeUsersCount / totalUsers) * 100).toFixed(1) : '0.0';

    res.status(200).json({
      success: true,
      data: {
        workoutDistribution,
        userGrowth,
        avgMacros: macros[0] || { avgProtein: 0, avgCarbs: 0, avgFats: 0 },
        activityPulse,
        syncRate
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnalytics
};
