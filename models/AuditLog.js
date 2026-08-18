const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['SYSTEM', 'AUTH', 'PAYMENT', 'SUPPORT', 'SECURITY'],
    default: 'SYSTEM'
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    default: 'INFO'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
