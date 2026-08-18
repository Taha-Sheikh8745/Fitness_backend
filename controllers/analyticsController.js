const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const Goal = require('../models/Goal');
const mongoose = require('mongoose');

// @desc    Predict future weight (7 days)
// @route   GET /api/analytics/predict-weight
// @access  Private
const predictWeight = async (req, res, next) => {
  try {
    const cacheKey = `analytics:predict:${req.user._id}:${new Date().toISOString().split('T')[0]}`;
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({ success: true, data: cachedData, cached: true });
    }
    const result = await analyticsService.predictFutureWeight(req.user._id);
    if (!result.success) {
      return res.status(200).json({ success: false, message: result.message, data: null });
    }
    cacheService.set(cacheKey, result, 720);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full analytics report data (all charts + stats for PDF)
// @route   GET /api/analytics/report
// @access  Private
const getFullReport = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); d.setHours(0,0,0,0); return d; })();
    const end = endDate ? new Date(endDate) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();

    // ── All workouts in range ───────────────────────────────────────────
    const workouts = await Workout.find({ user: userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });

    // ── Workout volume per day ──────────────────────────────────────────
    const workoutVolume = await Workout.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $unwind: '$exercises' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          volume: { $sum: { $multiply: ['$exercises.sets', '$exercises.reps', '$exercises.weight'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ── Workout frequency by day of week ───────────────────────────────
    const workoutByDow = await Workout.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const freqByDow = dowLabels.map((label, i) => ({
      day: label,
      count: workoutByDow.find(d => d._id === i + 1)?.count || 0
    }));

    // ── Category breakdown ─────────────────────────────────────────────
    const categoryBreakdown = await Workout.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── Muscle group distribution ──────────────────────────────────────
    const muscleGroups = await analyticsService.getMuscleGroupDistribution(userId, start, end);

    // ── Top exercises by max weight ────────────────────────────────────
    const topExercises = await Workout.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $unwind: '$exercises' },
      {
        $group: {
          _id: '$exercises.name',
          maxWeight: { $max: '$exercises.weight' },
          totalSets: { $sum: '$exercises.sets' },
          totalReps: { $sum: '$exercises.reps' },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { maxWeight: -1 } },
      { $limit: 10 }
    ]);

    // ── Strength progression for top 3 exercises ──────────────────────
    const strengthProgressions = {};
    const topThree = topExercises.slice(0, 3);
    for (const ex of topThree) {
      strengthProgressions[ex._id] = await analyticsService.getStrengthProgression(userId, ex._id);
    }

    // ── Total workout stats ────────────────────────────────────────────
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    let totalDuration = 0;
    workouts.forEach(w => {
      totalDuration += w.duration || 0;
      w.exercises?.forEach(e => {
        totalVolume += e.sets * e.reps * e.weight;
        totalSets += e.sets;
        totalReps += e.reps;
      });
    });
    const avgDuration = workouts.length ? Math.round(totalDuration / workouts.length) : 0;

    // ── Progress / body metrics ────────────────────────────────────────
    const progressLogs = await Progress.find({ user: userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
    const allProgressLogs = await Progress.find({ user: userId }).sort({ date: 1 });

    let weightStats = null;
    if (progressLogs.length >= 2) {
      const first = progressLogs[0];
      const last = progressLogs[progressLogs.length - 1];
      const bfLogs = progressLogs.filter(l => l.bodyFatPercentage != null);
      weightStats = {
        startWeight: first.weight,
        currentWeight: last.weight,
        weightChange: +(last.weight - first.weight).toFixed(1),
        startBodyFat: bfLogs[0]?.bodyFatPercentage || null,
        currentBodyFat: bfLogs[bfLogs.length - 1]?.bodyFatPercentage || null,
        bodyFatChange: bfLogs.length >= 2
          ? +(bfLogs[bfLogs.length - 1].bodyFatPercentage - bfLogs[0].bodyFatPercentage).toFixed(1)
          : null,
        measurements: last.measurements || {}
      };
    } else if (progressLogs.length === 1) {
      weightStats = {
        startWeight: progressLogs[0].weight,
        currentWeight: progressLogs[0].weight,
        weightChange: 0,
        currentBodyFat: progressLogs[0].bodyFatPercentage || null,
        measurements: progressLogs[0].measurements || {}
      };
    }

    const weightTrend = progressLogs.map(l => ({
      date: l.date.toISOString().split('T')[0],
      weight: l.weight,
      bodyFat: l.bodyFatPercentage || null
    }));

    // ── Nutrition ─────────────────────────────────────────────────────
    const nutritionAgg = await Nutrition.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$calories' },
          totalProtein: { $sum: '$protein' },
          totalCarbs: { $sum: '$carbs' },
          totalFats: { $sum: '$fats' },
          days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }
        }
      }
    ]);
    const n = nutritionAgg[0] || {};
    const nutritionDays = n.days?.length || 1;
    const nutritionSummary = {
      totalCalories: n.totalCalories || 0,
      totalProtein: Math.round(n.totalProtein || 0),
      totalCarbs: Math.round(n.totalCarbs || 0),
      totalFats: Math.round(n.totalFats || 0),
      avgCalories: Math.round((n.totalCalories || 0) / nutritionDays),
      avgProtein: Math.round((n.totalProtein || 0) / nutritionDays),
      avgCarbs: Math.round((n.totalCarbs || 0) / nutritionDays),
      avgFats: Math.round((n.totalFats || 0) / nutritionDays),
    };

    const dailyCalories = await Nutrition.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          calories: { $sum: '$calories' },
          protein: { $sum: '$protein' },
          carbs: { $sum: '$carbs' },
          fats: { $sum: '$fats' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const mealTypeBreakdown = await Nutrition.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$mealType', calories: { $sum: '$calories' }, count: { $sum: 1 } } },
      { $sort: { calories: -1 } }
    ]);

    // ── Calorie-weight correlation ─────────────────────────────────────
    const correlation = await analyticsService.getCalorieWeightCorrelation(userId, 60);

    // ── Goals ─────────────────────────────────────────────────────────
    const goals = await Goal.find({ user: userId }).sort({ deadline: 1 });
    const goalsProgress = goals.map(g => {
      const total = Math.abs(g.targetValue - g.currentValue) || 1;
      const achieved = Math.abs(g.currentValue - (g.currentValue - (g.targetValue - g.currentValue)));
      const pct = Math.min(100, Math.max(0,
        g.type === 'Weight'
          ? g.targetValue < g.currentValue
            ? Math.round(((g.currentValue - (weightStats?.currentWeight || g.currentValue)) / (g.currentValue - g.targetValue)) * 100)
            : 0
          : Math.round((g.currentValue / g.targetValue) * 100)
      ));
      return {
        _id: g._id,
        type: g.type,
        category: g.category,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        deadline: g.deadline,
        status: g.status,
        percentage: pct
      };
    });

    // ── Predictive weight ──────────────────────────────────────────────
    let prediction = null;
    try {
      const predResult = await analyticsService.predictFutureWeight(userId);
      if (predResult.success) prediction = predResult;
    } catch (_) {}

    // ── AI Insights ───────────────────────────────────────────────────
    const insights = await analyticsService.generateInsights(userId);

    // ── Heatmap ───────────────────────────────────────────────────────
    const heatmap = await analyticsService.getWorkoutHeatmap(userId, start, end);

    res.status(200).json({
      success: true,
      data: {
        period: { start: start.toISOString(), end: end.toISOString() },
        workoutStats: {
          totalWorkouts: workouts.length,
          totalVolume: Math.round(totalVolume),
          totalSets,
          totalReps,
          avgDuration,
          totalDuration
        },
        workoutVolume,
        freqByDow,
        categoryBreakdown,
        muscleGroups,
        topExercises,
        strengthProgressions,
        weightStats,
        weightTrend,
        nutritionSummary,
        dailyCalories,
        mealTypeBreakdown,
        correlation,
        goalsProgress,
        prediction,
        insights,
        heatmap
      }
    });
  } catch (error) {
    console.error('Report Error:', error);
    next(error);
  }
};

module.exports = { predictWeight, getFullReport };
