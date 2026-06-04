const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // 👤 Message bhejne wale user ki ID (Ref linked to User schema)
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // 👤 Private message receive karne wale user ki ID (Conditional for 1-on-1 chats)
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  // 👥 NEW WHATSAPP GROUP CHAT REFERENCE MAPPING GATE 📱
  // 'default: null' ensures 1-on-1 conversations do not break down
  group: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ChatGroup', 
    default: null 
  },
  // 💬 Raw text content layer of the message packet stream
  text: { 
    type: String, 
    required: true,
    trim: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);