const Habit = require('../models/Habit');

// @desc    Get all habits for today
// @route   GET /api/habits
// @access  Private
const getHabits = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const habits = await Habit.find({
      user: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });
    res.status(200).json({ success: true, data: habits });
  } catch (error) {
    next(error);
  }
};

// @desc    Update or create habit progress
// @route   POST /api/habits
// @access  Private
const updateHabit = async (req, res, next) => {
  try {
    const { name, completedValue, targetValue, unit, icon, color, category, frequency, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updateData = {
      completedValue,
      targetValue,
      unit,
      icon: icon || 'Activity',
      color: color || 'text-blue-400',
      category: category || 'General',
      frequency: frequency || 'Daily',
      notes: notes || ''
    };

    let habit = await Habit.findOneAndUpdate(
      { user: req.user._id, name, date: today },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    const gamificationService = require('../services/gamificationService');
    await gamificationService.awardXP(req.user._id, 20);

    res.status(200).json({ success: true, data: habit });

  } catch (error) {
    next(error);
  }
};

module.exports = { getHabits, updateHabit };
