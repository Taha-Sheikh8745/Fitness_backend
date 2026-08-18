const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const mongoose = require('mongoose');
const { getPreviousPeriod, calculateTrend } = require('../utils/dateHelpers');

// @desc    Get advanced dashboard summary based on date filter
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    let { startDate, endDate } = req.query;

    const currentStart = startDate ? new Date(startDate) : new Date();
    currentStart.setHours(0, 0, 0, 0);
    
    const currentEnd = endDate ? new Date(endDate) : new Date();
    currentEnd.setHours(23, 59, 59, 999);

    const { prevStart, prevEnd } = getPreviousPeriod(currentStart, currentEnd);

    // ==========================================
    // 1. Current Period Aggregations
    // ==========================================
    
    // Workouts
    const workoutsCurrent = await Workout.aggregate([
        { $match: { user: userId, date: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const currentWorkoutCount = workoutsCurrent[0]?.count || 0;

    // Nutrition (Calories and Macros)
    const nutritionCurrent = await Nutrition.aggregate([
        { $match: { user: userId, date: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { 
            _id: null, 
            totalCalories: { $sum: "$calories" },
            totalProtein: { $sum: "$protein" },
            totalCarbs: { $sum: "$carbs" },
            totalFats: { $sum: "$fats" }
        } }
    ]);
    const currentCalories = nutritionCurrent[0]?.totalCalories || 0;
    const currentProtein = nutritionCurrent[0]?.totalProtein || 0;
    const currentCarbs = nutritionCurrent[0]?.totalCarbs || 0;
    const currentFats = nutritionCurrent[0]?.totalFats || 0;

    // Weight and Progress
    const progressLogsCurrent = await Progress.find({ user: userId, date: { $lte: currentEnd } }).sort({ date: -1 });
    const currentWeight = progressLogsCurrent[0]?.weight || 0;
    
    // Find the starting weight within the chosen period to determine net change for that period
    const oldestProgressInPeriod = await Progress.find({ user: userId, date: { $gte: currentStart, $lte: currentEnd } }).sort({ date: 1 }).limit(1);
    const startWeightOfPeriod = oldestProgressInPeriod[0]?.weight || currentWeight; // fallback if no entries in period
    const currentWeightChange = currentWeight - startWeightOfPeriod; 

    // ==========================================
    // 2. Previous Period Aggregations
    // ==========================================
    
    // Previous Workouts
    const workoutsPrev = await Workout.aggregate([
        { $match: { user: userId, date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const prevWorkoutCount = workoutsPrev[0]?.count || 0;

    // Previous Calories
    const nutritionPrev = await Nutrition.aggregate([
        { $match: { user: userId, date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, totalCalories: { $sum: "$calories" } } }
    ]);
    const prevCalories = nutritionPrev[0]?.totalCalories || 0;

    // Previous Weight Change Calculation
    const progressLogsPrev = await Progress.find({ user: userId, date: { $lte: prevEnd } }).sort({ date: -1 });
    const prevPeriodEndWeight = progressLogsPrev[0]?.weight || 0;
    const oldestProgressInPrevPeriod = await Progress.find({ user: userId, date: { $gte: prevStart, $lte: prevEnd } }).sort({ date: 1 }).limit(1);
    const prevStartWeightOfPeriod = oldestProgressInPrevPeriod[0]?.weight || prevPeriodEndWeight;
    const prevWeightChange = prevPeriodEndWeight - prevStartWeightOfPeriod;

    // ==========================================
    // 3. Trend Calculations
    // ==========================================
    const workoutsTrend = calculateTrend(currentWorkoutCount, prevWorkoutCount);
    const caloriesTrend = calculateTrend(currentCalories, prevCalories);
    const weightChangeTrend = calculateTrend(currentWeightChange, prevWeightChange);

    // ==========================================
    // 4. Charts Data (Bound by Date Limit)
    // ==========================================
    const weightProgress = await Progress.find({ user: userId, date: { $gte: currentStart, $lte: currentEnd } })
      .sort({ date: 1 })
      .select('weight date -_id');

    const recentNutrition = await Nutrition.aggregate([
      { $match: { user: userId, date: { $gte: currentStart, $lte: currentEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalCalories: { $sum: "$calories" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const workoutCategoryFreq = await Workout.aggregate([
      { $match: { user: userId, date: { $gte: currentStart, $lte: currentEnd } } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    const analyticsService = require('../services/analyticsService');

    // Advanced Stats using Analytics Service
    const [insights, heatmap, muscleDist, correlation] = await Promise.all([
      analyticsService.generateInsights(userId),
      analyticsService.getWorkoutHeatmap(userId, currentStart, currentEnd),
      analyticsService.getMuscleGroupDistribution(userId, currentStart, currentEnd),
      analyticsService.getCalorieWeightCorrelation(userId)
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          currentWeight,
          metrics: {
              workouts: { value: currentWorkoutCount, trend: workoutsTrend },
              calories: { value: currentCalories, trend: caloriesTrend },
              macros: {
                 protein: currentProtein,
                 carbs: currentCarbs,
                 fats: currentFats
              },
              weightChange: { value: Number(currentWeightChange.toFixed(1)), trend: weightChangeTrend }
          }
        },
        charts: {
          weightProgress,
          recentNutrition,
          workoutCategoryFreq,
          heatmap,
          muscleDist,
          correlation
        },
        insights
      }
    });


  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Global Search (Workouts & Nutrition)
// @route   GET /api/dashboard/search
// @access  Private
const getGlobalSearch = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json({ success: true, data: { workouts: [], nutrition: [] } });
    }
    const regex = new RegExp(query, 'i');
    const workouts = await Workout.find({ user: req.user._id, 'exercises.name': regex }).limit(10);
    const nutrition = await Nutrition.find({ user: req.user._id, foodName: regex }).limit(10);
    res.status(200).json({ success: true, data: { workouts, nutrition } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getDashboardData,
  getGlobalSearch
};
