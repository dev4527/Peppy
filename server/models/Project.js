const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  teamCategory: {
    type: String,
    required: true,
    default: 'Website Team' // Match text formats safely
  },
  sharedTeams: [{
    type: String,
    trim: true
  }],
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  googleWorkspace: {
    calendarId: { type: String, trim: true, default: '' },
    driveFolderId: { type: String, trim: true, default: '' },
    notificationEmail: { type: String, trim: true, lowercase: true, default: '' },
    lastSyncedAt: { type: Date, default: null }
  },
  clonedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
