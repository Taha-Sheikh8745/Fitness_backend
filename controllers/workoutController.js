const Workout = require('../models/Workout');
const { createNotification } = require('../utils/notificationHelper');
const { logEvent } = require('../services/logService');

// @desc    Get user workouts
// @route   GET /api/workouts
// @access  Private
const getWorkouts = async (req, res) => {
  try {
    const { search, category, tags, startDate, endDate } = req.query;
    const filter = { user: req.user._id };

    if (search) {
      filter['exercises.name'] = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }
    if (tags) {
      const tagsArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagsArray };
    }

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        // Ensure end date includes the end of the day if it's the same
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    const workouts = await Workout.find(filter).sort({ date: -1 });
    
    // Calculate total volume across filtered workouts
    let totalVolume = 0;
    workouts.forEach(workout => {
        workout.exercises?.forEach(ex => {
            totalVolume += (ex.sets * ex.reps * ex.weight);
        });
    });

    res.status(200).json({ success: true, data: workouts, totalVolume });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add a workout
// @route   POST /api/workouts
// @access  Private
const addWorkout = async (req, res) => {
  try {
    const { duration, exercises, category, muscleGroup, notes, date, tags } = req.body;

    const workout = await Workout.create({
      user: req.user._id,
      duration,
      exercises,
      category,
      muscleGroup,
      tags,
      notes,
      date: date ? new Date(date) : Date.now(),
    });

    const gamificationService = require('../services/gamificationService');

    await createNotification(
      req.user._id,
      `You successfully logged a new workout: ${muscleGroup || category}`,
      'Workout'
    );

    // Gamification Hook
    await gamificationService.awardXP(req.user._id, 100);
    await gamificationService.updateStreak(req.user._id);

    // Log audit event
    await logEvent({
      event: 'WORKOUT_LOGGED',
      message: `User ${req.user.email} logged a ${category} workout (${muscleGroup})`,
      category: 'WORKOUT',
      user: req.user._id
    });


    res.status(201).json({ success: true, data: workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update a workout
// @route   PUT /api/workouts/:id
// @access  Private
const updateWorkout = async (req, res) => {
  try {
    let workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    // Checking Ownership
    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    workout = await Workout.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete a workout
// @route   DELETE /api/workouts/:id
// @access  Private
const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await workout.deleteOne();

    // Log audit event
    await logEvent({
      event: 'WORKOUT_DELETED',
      message: `User ${req.user.email} deleted a workout from ${new Date(workout.date).toLocaleDateString()}`,
      category: 'WORKOUT',
      user: req.user._id
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
};
