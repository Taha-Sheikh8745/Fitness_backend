const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  bodyFatPercentage: {
    type: Number,
  },
  measurements: {
    chest: Number,
    arms: Number,
    waist: Number,
    legs: Number,
    shoulders: Number,
    biceps: Number,
  },
  performanceMetrics: [{
    metricName: { type: String },
    metricValue: { type: String }
  }],
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Performance Indexes
progressSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Progress', progressSchema);

