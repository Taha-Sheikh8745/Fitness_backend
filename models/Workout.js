const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  duration: {
    type: Number,
  },
  exercises: [
    {
      name: { type: String, required: true },
      sets: { type: Number, required: true },
      reps: { type: Number, required: true },
      weight: { type: Number, required: true },
    }
  ],
  category: {
    type: String,
    enum: ['Strength', 'Cardio', 'Flexibility', 'Other', 'HIIT'],
    default: 'Strength',
  },
  muscleGroup: {
    type: String,
  },
  tags: [{
    type: String,
  }],
  notes: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Performance Indexes
workoutSchema.index({ user: 1, date: -1 });
workoutSchema.index({ 'exercises.name': 'text', category: 'text', muscleGroup: 'text' });
workoutSchema.index({ 'exercises.name': 1 });
workoutSchema.index({ category: 1 });
workoutSchema.index({ muscleGroup: 1 });

module.exports = mongoose.model('Workout', workoutSchema);
