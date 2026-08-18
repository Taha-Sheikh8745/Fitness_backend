const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');

// @desc    Global search across entities
// @route   GET /api/search
// @access  Private
const getGlobalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(200).json({ success: true, data: { workouts: [], nutrition: [], progress: [] } });
    }

    const regex = new RegExp(q, 'i');

    const [workouts, nutrition, progress] = await Promise.all([
      Workout.find({ 
        user: req.user._id, 
        $or: [
          { 'exercises.name': { $regex: regex } },
          { category: { $regex: regex } },
          { muscleGroup: { $regex: regex } },
          { tags: { $in: [regex] } },
          { notes: { $regex: regex } }
        ]
      }).sort({ date: -1 }).limit(20),

      Nutrition.find({
        user: req.user._id,
        $or: [
          { foodName: { $regex: regex } },
          { mealType: { $regex: regex } }
        ]
      }).sort({ date: -1 }).limit(20),

      Progress.find({
        user: req.user._id,
        notes: { $regex: regex }
      }).sort({ date: -1 }).limit(20)
    ]);


    res.status(200).json({
      success: true,
      data: {
        workouts,
        nutrition,
        progress
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getGlobalSearch };
