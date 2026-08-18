const Task = require('../models/Task');

// @desc    Get all tasks for user (with date filter)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = { user: req.user._id };
    
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      query.dueDate = { $gte: start, $lte: end };
    }

    const tasks = await Task.find(query).sort({ completed: 1, dueDate: 1 });
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({
      ...req.body,
      user: req.user._id
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task completion
// @route   PATCH /api/tasks/:id
// @access  Private
const toggleTaskLimit = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.completed = !task.completed;
    await task.save();

    if (task.completed) {
      const gamificationService = require('../services/gamificationService');
      await gamificationService.awardXP(req.user._id, 10);
    }

    res.status(200).json({ success: true, data: task });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, createTask, toggleTaskLimit, deleteTask };
