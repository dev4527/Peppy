const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');

// @route   GET api/notifications
// @desc    Get all workspace notifications for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    // 🧠 TARGETING EXACT USER PAYLOAD MATRIX PATHWAY
    let userId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        userId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        userId = req.user.id || req.user._id;
      } else {
        userId = req.user;
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'User identity matrix lost inside notification router.' });
    }

    // Fetch top 20 recent alerts for this specific logged-in employee
    const alerts = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json(alerts);
  } catch (error) {
    console.error('❌ Fetch notifications failure logs:', error);
    return res.status(500).json({ message: 'Server database alerts pull drop.' });
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark a specific notification item as read securely
router.put('/:id/read', auth, async (req, res) => {
  try {
    const alert = await Notification.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Notification item not found in cluster.' });
    }

    alert.isRead = true;
    await alert.save();
    return res.json(alert);
  } catch (error) {
    console.error('❌ Update alert state failure:', error);
    return res.status(500).json({ message: 'Failed to update alert validation state.' });
  }
});

module.exports = router;