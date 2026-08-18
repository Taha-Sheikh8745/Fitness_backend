const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const mongoose = require('mongoose');

/**
 * Service to handle complex fitness and health data aggregations.
 */
class AnalyticsService {
  /**
   * Generates a workout heatmap (frequency per date)
   */
  async getWorkoutHeatmap(userId, startDate, endDate) {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return await Workout.aggregate([
      { $match: { user: userObjId, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  /**
   * Generates muscle group distribution
   */
  async getMuscleGroupDistribution(userId, startDate, endDate) {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return await Workout.aggregate([
      { $match: { user: userObjId, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$muscleGroup",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  /**
   * Predicts future weight based on last 30 days of logs using linear regression.
   */
  async predictFutureWeight(userId, daysToPredict = 7) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await Progress.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    if (logs.length < 5) {
      return {
        success: false,
        message: 'Insufficient data. Minimum 5 logs in last 30 days required for prediction.'
      };
    }

    const startDate = logs[0].date.getTime();
    const data = logs.map(log => ({
      x: (log.date.getTime() - startDate) / (1000 * 60 * 60 * 24),
      y: log.weight
    }));

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach(p => {
      sumX += p.x; sumY += p.y;
      sumXY += p.x * p.y; sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const lastX = (logs[logs.length - 1].date.getTime() - startDate) / (1000 * 60 * 60 * 24);

    const predictions = [];
    for (let i = 1; i <= daysToPredict; i++) {
        const nextDate = new Date(logs[logs.length - 1].date);
        nextDate.setDate(nextDate.getDate() + i);
        predictions.push({
            date: nextDate,
            weight: Number((slope * (lastX + i) + intercept).toFixed(1))
        });
    }

    return { success: true, dailyTrend: Number(slope.toFixed(3)), predictions };
  }

  /**
   * Tracks strength progression for a specific exercise
   */
  async getStrengthProgression(userId, exerciseName) {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return await Workout.aggregate([
      { $match: { user: userObjId, 'exercises.name': { $regex: new RegExp(exerciseName, 'i') } } },
      { $unwind: "$exercises" },
      { $match: { 'exercises.name': { $regex: new RegExp(exerciseName, 'i') } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          maxWeight: { $max: "$exercises.weight" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  /**
   * Calculates correlation between Calories and Weight
   */
  async getCalorieWeightCorrelation(userId, limit = 30) {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const nutrition = await Nutrition.aggregate([
      { $match: { user: userObjId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          calories: { $sum: "$calories" }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: limit }
    ]);

    const progress = await Progress.find({ user: userObjId })
      .sort({ date: -1 })
      .limit(limit)
      .select('weight date');

    // Merge by date
    return nutrition.map(n => {
      const p = progress.find(pg => pg.date && pg.date.toISOString().split('T')[0] === n._id);
      return {
        date: n._id,
        calories: n.calories,
        weight: p ? p.weight : null
      };
    }).filter(item => item.weight !== null);
  }

  /**
   * Insight Engine
   */
  async generateInsights(userId) {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const insights = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const proteinData = await Nutrition.aggregate([
        { $match: { user: userObjId, date: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, avgProtein: { $avg: "$protein" } } }
    ]);

    if (proteinData[0]?.avgProtein < 80) {
        insights.push("Protein intake is low. Increase it to support muscle recovery.");
    }

    const workouts = await Workout.countDocuments({ user: userObjId, date: { $gte: sevenDaysAgo } });
    if (workouts < 3) {
        insights.push("Consistency is key! You've logged only " + workouts + " workouts this week.");
    } else {
        insights.push("Great job! You're staying consistent with your workouts.");
    }

    return insights;
  }
}

module.exports = new AnalyticsService();
