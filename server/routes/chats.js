const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/authMiddleware');

// @route   GET api/chats/history/:userId
// @desc    Get chat history between logged-in user and target user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    // 🎯 RE-MAPPED TO TARGET EXACT PAYLOAD PATHWAY
    let currentUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        currentUserId = req.user.user.id; // ✅ Target path fixed
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
// @desc    Save a message to the database
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Cannot send empty string.' });
    }

    // 🎯 RE-MAPPED TO TARGET EXACT PAYLOAD PATHWAY
    let senderId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        senderId = req.user.user.id; // ✅ Target path fixed
      } else if (typeof req.user === 'object') {
        senderId = req.user.id || req.user._id;
      } else {
        senderId = req.user;
      }
    }

    // Critical failure guard bypass layer
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

module.exports = router;