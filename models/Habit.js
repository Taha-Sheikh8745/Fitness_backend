const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
  },
  targetValue: {
    type: Number,
    required: [true, 'Target value is required'],
    min: [0, 'Target value cannot be negative'],
  },
  completedValue: {
    type: Number,
    default: 0,
    min: [0, 'Completed value cannot be negative'],
  },
  unit: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'Activity', // Default lucide icon name
  },
  color: {
    type: String,
    default: 'text-blue-400',
  },
  category: {
    type: String,
    default: 'General',
  },
  frequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Daily',
  },
  notes: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Ensure unique habit-per-day-per-user-per-name
habitSchema.index({ user: 1, name: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Habit', habitSchema);
