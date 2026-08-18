const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Manual', 'AI'],
    default: 'Manual',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  recurring: {
    type: String,
    enum: ['None', 'Daily', 'Weekly'],
    default: 'None',
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
