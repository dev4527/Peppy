const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// ==========================================
// 👤 USER AUTHENTICATION SYSTEM (SIGNUP/LOGIN)
// ==========================================

// @route    POST api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, team, managerId, managerTarget } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ message: 'User already exists.' });

    const executiveTeams = {
      CTO: 'Technical Team',
      CMO: 'Marketing Team',
      COO: 'Operations Team',
      CPO: 'Product Team'
    };
    const isExecutive = Boolean(executiveTeams[role]);
    const normalizedRole = isExecutive ? 'Manager' : (role || 'Employee');
    const selectedManagerRole = normalizedRole === 'Employee' ? managerTarget : null;
    const managerProfile = managerId
      ? await User.findById(managerId)
      : selectedManagerRole
        ? await User.findOne({ role: 'Manager', managerRole: selectedManagerRole })
        : null;
    const resolvedTeam = normalizedRole === 'Admin'
      ? 'Global Command Hub'
      : isExecutive
        ? executiveTeams[role]
        : managerProfile?.team || executiveTeams[selectedManagerRole] || team || 'Technical Team';

    user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: normalizedRole,
      team: resolvedTeam,
      manager: managerProfile?._id || null,
      managerRole: isExecutive ? role : selectedManagerRole
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, role: user.role, team: user.team } };
    jwt.sign(payload, process.env.JWT_SECRET || 'peppySecretKeyMaster', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, managerRole: user.managerRole } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    POST api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials.' });

    const payload = { user: { id: user.id, role: user.role, team: user.team } };
    jwt.sign(payload, process.env.JWT_SECRET || 'peppySecretKeyMaster', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, managerRole: user.managerRole } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    let targetUserId = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
    const user = await User.findById(targetUserId).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 👥 100% FIXED HIERARCHY TEST CONTROLLER
// ==========================================

// 👑 MASTER DIRECTORY: Admin or global users retrieval
router.get('/users', auth, async (req, res) => {
  try {
    let currentCreatorID = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
    const currentUserProfile = await User.findById(currentCreatorID);

    let usersList = [];
    
    // 🚀 FIXED BYPASS: Agar login user Admin (Shyamal) hai, toh bina kisi validation restrictions ke DIRECT saare employees pull karo!
    if (currentUserProfile && currentUserProfile.role === 'Admin') {
      usersList = await User.find({ _id: { $ne: currentCreatorID } }).select('-password').sort({ name: 1 });
    } else if (currentUserProfile && currentUserProfile.role === 'Manager') {
      // Managers should only see their direct reports and users assigned to projects they created
      const managerId = currentCreatorID;
      // Direct reports
      const directReports = await User.find({ manager: managerId }).select('-password').sort({ name: 1 });

      // Users assigned to tasks in projects created by this manager
      const managerProjects = await require('../models/Project').find({ createdBy: managerId }).select('_id');
      const projectIds = managerProjects.map(p => p._id);
      const tasks = await require('../models/Task').find({ project: { $in: projectIds } }).select('assignedTo');
      const assignedUserIds = tasks.map(t => String(t.assignedTo)).filter(Boolean);

      const assignedUsers = await User.find({ _id: { $in: assignedUserIds } }).select('-password').sort({ name: 1 });

      // Merge unique users
      const mergedMap = new Map();
      directReports.forEach(u => mergedMap.set(String(u._id), u));
      assignedUsers.forEach(u => mergedMap.set(String(u._id), u));

      usersList = Array.from(mergedMap.values());
    } else {
      // Regular employees can start private chats with colleagues in their team.
      usersList = await User.find({
        team: currentUserProfile.team,
        _id: { $ne: currentCreatorID }
      }).select('-password').sort({ name: 1 });
    }

    return res.json(usersList);
  } catch (err) {
    console.error('❌ Hierarchy global query fetch error:', err);
    return res.status(500).json({ message: 'Server database users directory parse drop.' });
  }
});

// 🏢 MOVEMENT BOUNDARY: Fetch users mapped under a specific manager/team track
router.get('/users/team/:teamName', auth, async (req, res) => {
  try {
    let currentCreatorID = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
    const decodedTeamName = decodeURIComponent(req.params.teamName);
    
    const queryCriteria = { 
      team: decodedTeamName,
      _id: { $ne: currentCreatorID }
    };

    const teamEmployees = await User.find(queryCriteria).select('-password').sort({ name: 1 });
    return res.json(teamEmployees);
  } catch (err) {
    console.error('❌ Team path dynamic matching filter fail:', err);
    return res.status(500).json({ message: 'Server team query execution drop.' });
  }
});

module.exports = router;
