const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['Weight', 'BodyFat', 'Strength'],
    required: true,
  },
  targetValue: {
    type: Number,
    required: true,
  },
  currentValue: {
    type: Number,
    required: true,
  },
  category: {
    type: String, // e.g., 'Bench Press' or 'General'
    default: 'General',
  },
  deadline: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['In Progress', 'Achieved', 'Failed'],
    default: 'In Progress',
  }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
