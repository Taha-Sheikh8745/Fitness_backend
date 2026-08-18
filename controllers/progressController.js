const Progress = require('../models/Progress');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get user progress logs
// @route   GET /api/progress
// @access  Private
const getProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = { user: req.user._id };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.date.$lte = end;
      }
    }

    const progressLogs = await Progress.find(filter).sort({ date: 1 });

    res.status(200).json({ success: true, data: progressLogs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add a progress log
// @route   POST /api/progress
// @access  Private
const addProgress = async (req, res) => {
  try {
    let { weight, bodyFatPercentage, measurements, notes, date } = req.body;

    if (!weight || isNaN(weight) || weight <= 0) {
      return res.status(400).json({ success: false, message: 'Valid weight is required' });
    }

    if (bodyFatPercentage && (isNaN(bodyFatPercentage) || bodyFatPercentage < 0 || bodyFatPercentage > 100)) {
       return res.status(400).json({ success: false, message: 'Valid body fat percentage is required' });
    }

    const logDate = date ? new Date(date) : new Date();

    const progress = await Progress.create({
      user: req.user._id,
      weight: Number(weight),
      bodyFatPercentage: bodyFatPercentage ? Number(bodyFatPercentage) : undefined,
      measurements: measurements || {},
      notes: notes || '',
      date: logDate,
    });

    await createNotification(
      req.user._id,
      `You tracked your progress: ${weight} kg recorded.`,
      'Progress'
    );

    res.status(201).json({ success: true, data: progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a progress log
// @route   PUT /api/progress/:id
// @access  Private
const updateProgress = async (req, res) => {
  try {
    let progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    let { weight, bodyFatPercentage, measurements, notes, date } = req.body;
    
    if (weight) progress.weight = Number(weight);
    if (bodyFatPercentage !== undefined) progress.bodyFatPercentage = bodyFatPercentage ? Number(bodyFatPercentage) : undefined;
    if (measurements) progress.measurements = measurements;
    if (notes !== undefined) progress.notes = notes;
    if (date) progress.date = new Date(date);

    await progress.save();

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a progress log
// @route   DELETE /api/progress/:id
// @access  Private
const deleteProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress log not found' });
    }

    if (progress.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await progress.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getProgress,
  addProgress,
  updateProgress,
  deleteProgress,
};
