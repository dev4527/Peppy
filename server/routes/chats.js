const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ChatGroup = require('../models/ChatGroup');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// ==========================================
// 👤 EXISTING 1-ON-1 PRIVATE CHATS SECTION
// ==========================================

// @route   GET api/chats/history/:userId
// @desc    Get chat history between logged-in user and target user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    let currentUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        currentUserId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        currentUserId = req.user.id || req.user._id;
      } else {
        currentUserId = req.user;
      }
    }

    const targetUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'User identity matrix context drop.' });
    }

    // Fetch conversation thread chronological flow
    const chatHistory = await Message.find({
      $or: [
        { sender: currentUserId, receiver: targetUserId },
        { sender: targetUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    return res.json(chatHistory);
  } catch (error) {
    console.error('❌ Chat history fetch fail:', error);
    return res.status(500).json({ message: 'Server database chat retrieval failure.' });
  }
});

// @route   POST api/chats/send
// @desc    Save a private 1-on-1 message to the database
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Cannot send empty string.' });
    }

    let senderId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        senderId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        senderId = req.user.id || req.user._id;
      } else {
        senderId = req.user;
      }
    }

    if (!senderId) {
      return res.status(401).json({ message: 'Sender authentication context lost inside database pipeline wrapper.' });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      text: text.trim()
    });

    await newMessage.save();
    return res.json(newMessage);
  } catch (error) {
    console.error('❌ Message tracking write failure:', error);
    return res.status(500).json({ message: 'Internal engine chat log capture drop: ' + error.message });
  }
});


// ==========================================
// 👥 NEW WHATSAPP-STYLE GROUP CHATS SECTION
// ==========================================

// ➕ @route   POST api/chats/groups
// @desc    Create a new mini-WhatsApp corporate chat group channel
router.post('/groups', auth, async (req, res) => {
  const { name, description, teamScope, members } = req.body;

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group Name parameter is missing.' });
    }

    // ⚡ EXTRACTOR PIPELINE SAFEGUARD: Resolving token structure payload layers cleanly
    let targetUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        targetUserId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        targetUserId = req.user.id || req.user._id;
      } else {
        targetUserId = req.user;
      }
    }

    if (!targetUserId) {
      return res.status(401).json({ message: 'User authorization identity structure context drop.' });
    }

    const currentUser = await User.findById(targetUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User profile record reference missing inside dataset directory.' });
    }

    // Hierarchy Safeguard: Admin specifies team Scope, Manager/Employee automatically locks to their team folder
    const groupTeamScope = currentUser.role === 'Admin' ? (teamScope || 'Technical Team') : currentUser.team;

    // Build unique members array list seamlessly without any undefined parameters injection
    let finalMembersList = members || [];
    if (!finalMembersList.includes(targetUserId)) {
      finalMembersList.push(targetUserId);
    }

    const newGroup = new ChatGroup({
      name: name.trim(),
      description: description ? description.trim() : '',
      teamScope: groupTeamScope,
      members: finalMembersList,
      createdBy: targetUserId
    });

    await newGroup.save();
    console.log(`💬 New corporate WhatsApp-Group generated successfully: [${name.trim()}]`);

    return res.status(201).json(newGroup);
  } catch (error) {
    console.error('❌ Group generation transaction loop drop:', error);
    return res.status(500).json({ message: 'Server crash during team group creation: ' + error.message });
  }
});

// 🧭 @route   GET api/chats/groups
// @desc    Fetch groups dynamically based on role visibility criteria 📱
router.get('/groups', auth, async (req, res) => {
  try {
    // ⚡ EXTRACTION SAFEGUARD ALSO APPLIED HERE FOR QUERY PIPELINES
    let targetUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        targetUserId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        targetUserId = req.user.id || req.user._id;
      } else {
        targetUserId = req.user;
      }
    }

    if (!targetUserId) {
      return res.status(401).json({ message: 'User authorization extraction error during history stream access.' });
    }

    const currentUser = await User.findById(targetUserId);
    if (!currentUser) return res.status(404).json({ message: 'Authentication mismatch dataset record failure.' });

    let visibleGroups;

    // 👑 ADMIN / CEO LOOKUP: Gets absolutely every chat group inside the entire company
    if (currentUser.role === 'Admin') {
      visibleGroups = await ChatGroup.find().populate('members', 'name email role team').sort({ updatedAt: -1 });
    } 
    // 🏢 MANAGER & EMPLOYEE ACCESS: Can only see groups matching their team scope OR where they are manually added
    else {
      visibleGroups = await ChatGroup.find({
        $or: [
          { teamScope: currentUser.team },
          { members: targetUserId }
        ]
      }).populate('members', 'name email role team').sort({ updatedAt: -1 });
    }

    return res.json(visibleGroups);
  } catch (error) {
    console.error('❌ Visible chat group collection drop:', error);
    return res.status(500).json({ message: 'Server error processing group queries.' });
  }
});

// ⏳ @route   GET api/chats/group/history/:groupId
// @desc    Fetch message stream for a specific chat group channel
router.get('/group/history/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;

    let targetUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        targetUserId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        targetUserId = req.user.id || req.user._id;
      } else {
        targetUserId = req.user;
      }
    }

    // Verify if user is part of the requested group bounds
    const currentUser = await User.findById(targetUserId);
    const group = await ChatGroup.findById(groupId);

    if (!group) return res.status(404).json({ message: 'Group chat channel target not found.' });

    if (currentUser.role !== 'Admin' && group.teamScope !== currentUser.team && !group.members.includes(targetUserId)) {
      return res.status(403).json({ message: 'Access denied. You do not belong to this group cluster.' });
    }

    // Capture group history timeline sequence using groupId tracking parameters inside message documents
    const groupHistory = await Message.find({ group: groupId })
      .populate('sender', 'name email role team')
      .sort({ createdAt: 1 });

    return res.json(groupHistory);
  } catch (error) {
    console.error('❌ Group history stream retrieval failed:', error);
    return res.status(500).json({ message: 'Server exception mapping group conversations.' });
  }
});

// 🚀 @route   POST api/chats/group/send
// @desc    Save a group chat message to the database instance
router.post('/group/send', auth, async (req, res) => {
  try {
    const { groupId, text } = req.body;

    if (!text || !text.trim()) return res.status(400).json({ message: 'Cannot drop empty messages inside streams.' });

    let senderId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        senderId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        senderId = req.user.id || req.user._id;
      } else {
        senderId = req.user;
      }
    }

    const newMessage = new Message({
      sender: senderId,
      group: groupId, // Mapped parameter to isolate group streams
      text: text.trim()
    });

    await newMessage.save();
    
    // Populate sender details for immediate frontend append UI structures
    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name email role team');

    return res.json(populatedMessage);
  } catch (error) {
    console.error('❌ Group packet logging error:', error);
    return res.status(500).json({ message: 'Failed to write group message data frame.' });
  }
});

module.exports = router;