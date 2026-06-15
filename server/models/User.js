const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  // 👑 ASANA-STYLE ROLES (CEO/Admin, Manager, Employee/Member)
  role: { 
    type: String, 
    enum: ['Admin', 'Manager', 'Employee', 'Team Member'], 
    default: 'Team Member' 
  }, 
  // 🏢 DYNAMIC DEPARTMENT TEAM NAME (e.g., Website Team, Tech, Marketing)
  team: { 
    type: String, 
    default: 'Website Team',
    trim: true
  }
  ,
  // Reference to the user's direct manager (another User)
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Optional manager role label (e.g., CTO, CMO, COO)
  managerRole: {
    type: String,
    trim: true,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);