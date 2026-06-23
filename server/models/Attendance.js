const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  punchInAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  punchOutAt: {
    type: Date,
    default: null
  },
  totalMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  punchInMeta: {
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationLabel: { type: String, trim: true, default: '' }
  },
  punchOutMeta: {
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationLabel: { type: String, trim: true, default: '' }
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    default: 'Open',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
