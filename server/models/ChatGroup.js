const mongoose = require('mongoose');

const ChatGroupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true,
    default: '' 
  },
  // 🏢 Is group ka structure kis department team ke sath mapped hai
  teamScope: { 
    type: String, 
    default: 'Global' // 'Global' means Admin handles it, or specific team like 'Website Team'
  },
  // 👥 Array of user ObjectIds who belong to this group chat cluster
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  // Optional link to the Project this group is created for
  project: {
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

module.exports = mongoose.model('ChatGroup', ChatGroupSchema);