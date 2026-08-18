const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true,
  },
  foodName: {
    type: String,
    required: true,
  },
  calories: {
    type: Number,
    required: true,
  },
  protein: {
    type: Number,
    required: true, // in grams
  },
  carbs: {
    type: Number,
    required: true, // in grams
  },
  fats: {
    type: Number,
    required: true, // in grams
  },
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Performance Indexes
nutritionSchema.index({ user: 1, date: -1 });
nutritionSchema.index({ foodName: 1 });
nutritionSchema.index({ mealType: 1 });

module.exports = mongoose.model('Nutrition', nutritionSchema);
