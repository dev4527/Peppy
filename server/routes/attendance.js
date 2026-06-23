const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const auth = require('../middleware/authMiddleware');
const { loadCurrentUser } = require('../utils/accessControl');

const requestMeta = (req) => ({
  ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '',
  userAgent: req.headers['user-agent'] || '',
  latitude: req.body.latitude ?? null,
  longitude: req.body.longitude ?? null,
  locationLabel: req.body.locationLabel || ''
});

router.get('/me', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    const openSession = await Attendance.findOne({ user: currentUser._id, status: 'Open' }).sort({ punchInAt: -1 });
    const history = await Attendance.find({ user: currentUser._id }).sort({ punchInAt: -1 }).limit(30);
    return res.json({ openSession, history });
  } catch (error) {
    console.error('Attendance fetch failure:', error);
    return res.status(500).json({ message: 'Failed to load attendance history.' });
  }
});

router.post('/punch-in', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    const existingOpen = await Attendance.findOne({ user: currentUser._id, status: 'Open' });
    if (existingOpen) return res.status(409).json({ message: 'You already have an active punch-in session.', session: existingOpen });

    const session = await Attendance.create({
      user: currentUser._id,
      punchInMeta: requestMeta(req)
    });
    return res.status(201).json(session);
  } catch (error) {
    console.error('Punch-in failure:', error);
    return res.status(500).json({ message: 'Failed to punch in.' });
  }
});

router.post('/punch-out', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    const session = await Attendance.findOne({ user: currentUser._id, status: 'Open' }).sort({ punchInAt: -1 });
    if (!session) return res.status(404).json({ message: 'No active punch-in session found.' });

    session.punchOutAt = new Date();
    session.punchOutMeta = requestMeta(req);
    session.totalMinutes = Math.max(0, Math.round((session.punchOutAt.getTime() - session.punchInAt.getTime()) / 60000));
    session.status = 'Closed';
    await session.save();
    return res.json(session);
  } catch (error) {
    console.error('Punch-out failure:', error);
    return res.status(500).json({ message: 'Failed to punch out.' });
  }
});

router.get('/team', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Only admins and managers can view team attendance.' });
    }

    const query = {};
    if (currentUser.role === 'Manager') {
      const User = require('../models/User');
      const teamUsers = await User.find({ team: currentUser.team }).select('_id');
      query.user = { $in: teamUsers.map(user => user._id) };
    }

    const records = await Attendance.find(query)
      .populate('user', 'name email role team')
      .sort({ punchInAt: -1 })
      .limit(200);
    return res.json(records);
  } catch (error) {
    console.error('Team attendance fetch failure:', error);
    return res.status(500).json({ message: 'Failed to load team attendance.' });
  }
});

module.exports = router;
