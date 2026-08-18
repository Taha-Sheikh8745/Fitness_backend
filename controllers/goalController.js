const Goal = require('../models/Goal');

// @desc    Get all user goals
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ deadline: 1 });
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({
      ...req.body,
      user: req.user._id
    });
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update goal progress
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    // Auto-achieve logic
    if (goal.currentValue >= goal.targetValue && goal.status !== 'Achieved') {
        goal.status = 'Achieved';
        await goal.save();
    }

    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };
