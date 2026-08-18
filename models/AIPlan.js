const mongoose = require('mongoose');

const aiPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  planType: {
    type: String,
    enum: ['Diet', 'Workout', 'Full'],
    default: 'Full',
  },
  generatedPlan: {
    type: Object, // JSON structure from Gemini
    required: true,
  },
  userInputHash: {
    type: String, // Hash of profileData to use for caching
    required: true,
  }
}, { timestamps: true });

// Ensure quick lookup for caching
aiPlanSchema.index({ user: 1, userInputHash: 1 });

module.exports = mongoose.model('AIPlan', aiPlanSchema);
