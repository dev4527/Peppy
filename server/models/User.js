const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Team Member' }, // Admin, Manager, Member
  team: { type: String, default: 'Website Team' } // ✅ Added: Links user dynamically to a specific department team name
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);