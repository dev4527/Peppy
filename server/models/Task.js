const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Review', 'Completed'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  isMilestone: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  estimatedMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  actualMinutes: {
    type: Number,
    min: 0,
    default: 0
  },
  complexityScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 3
  },
  performanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  review: {
    required: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Not Required', 'Pending', 'Approved', 'Rejected'],
      default: 'Not Required'
    },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, trim: true, default: '' }
  },
  recurrenceType: {
    type: String,
    enum: ['Daily task', 'Weekly task', 'Monthly task', 'Quarterly task', 'One-time task'],
    default: 'One-time task'
  },
  
  // 📁 MULTI-FORMAT ASSETS ATTACHMENTS REPOSITORY
  attachments: [{
    fileName: { 
      type: String, 
      required: true 
    },
    filePath: { 
      type: String, 
      required: true 
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream' // Unlocks explicit identifier for generic/all file types
    },
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],

  // 🔗 ✅ ADDED: LIVE HYPERLINK REFERENCE EMBED TREE
  links: [{
    title: {
      type: String,
      default: 'Workspace Resource Link'
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  subtasks: [{
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    text: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: 'Team Member' },
    timestamp: { type: Date, default: Date.now }
  }],
  activities: [{
    text: { type: String },
    userName: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
