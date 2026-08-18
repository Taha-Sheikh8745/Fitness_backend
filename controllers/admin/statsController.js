const User = require('../../models/User');
const Workout = require('../../models/Workout');
const Support = require('../../models/Support');
const AuditLog = require('../../models/AuditLog');
const AIPlan = require('../../models/AIPlan');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeWorkouts = await Workout.countDocuments({});
    const pendingTickets = await Support.countDocuments({ status: 'Pending' });
    
    // Calculate Real Growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, role: 'user' });
    const growth = totalUsers > 0 ? `+${((newUsersLast30Days / totalUsers) * 100).toFixed(1)}%` : '+0%';

    // Calculate AI Requests Today (Real)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const aiRequestsToday = await AIPlan.countDocuments({ createdAt: { $gte: todayStart } });

    // User Activity for Chart (Real data from AuditLog) - Parallelized
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityPromises = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d);
      start.setHours(0,0,0,0);
      const end = new Date(d);
      end.setHours(23,59,59,999);
      
      activityPromises.push(
        AuditLog.distinct('user', { 
          createdAt: { $gte: start, $lte: end },
          category: 'AUTH'
        }).then(users => ({
          name: days[new Date(d).getDay()],
          active: users.length
        }))
      );
    }

    const userActivity = await Promise.all(activityPromises);

    // Fetch Recent Audit Logs
    const systemLogs = await AuditLog.find({})
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeWorkouts,
        pendingTickets,
        growth,
        aiRequestsToday,
        userActivity,
        systemLogs
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all audit logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);
      
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAuditLogs
};
