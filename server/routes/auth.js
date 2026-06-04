const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// @route   POST api/auth/register
// @desc    Register a new employee/user with team category context assignment
router.post('/register', async (req, res) => {
  const { name, email, password, role, team } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User identity profile already exists.' });
    }

    // Force strict structure defaults alignment
    user = new User({
      name: name.trim(),
      email: email.trim(),
      password,
      role: role || 'Team Member',
      team: team || 'Website Team' // Default fallback structural tracking segment
    });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Generate JWT Token Matrix
    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'peppy_super_secret_auth_key',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team } });
      }
    );
  } catch (error) {
    console.error('❌ Registration system drop:', error);
    res.status(500).json({ message: 'Server error during employee profile creation.' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & capture operational handshake token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials reference.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials reference.' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'peppy_super_secret_auth_key',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team } });
      }
    );
  } catch (error) {
    console.error('❌ Login pipeline error:', error);
    res.status(500).json({ message: 'Server error processing credentials session mapping.' });
  }
});

// @route   GET api/auth/user
// @desc    Get current authenticated session user profile matrix data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server session gathering error.' });
  }
});

// @route   GET api/auth/users
// @desc    Fetch workforce records dynamically based on roles (Admin vs Manager hierarchy 👑)
router.get('/users', auth, async (req, res) => {
  try {
    // 1. First fetch the currentUser to audit their execution clearance level
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'Session metadata mismatch.' });

    let users;
    // 👑 ADMIN / CEO ACCESS: Gets everyone globally across all workspaces
    if (currentUser.role === 'Admin') {
      users = await User.find().select('-password').sort({ createdAt: 1 });
    } 
    // 🏢 MANAGER ACCESS: Filter data bounds to only expose their specific team cluster
    else if (currentUser.role === 'Manager') {
      users = await User.find({ team: currentUser.team }).select('-password').sort({ createdAt: 1 });
    } 
    // 👤 EMPLOYEE ACCESS: Hardlocked block. Members cannot list global employee records.
    else {
      return res.status(403).json({ message: 'Access denied. Workspace controls restricted.' });
    }

    res.json(users);
  } catch (error) {
    console.error('❌ General user listing drop:', error);
    res.status(500).json({ message: 'Server error gathering corporate catalog listings.' });
  }
});

// ✅ ASANA SEPARATOR ROUTE CHANNEL LOOP
// @route   GET api/auth/users/team/:teamName
// @desc    Get all corporate employees belonging to a single isolated department team folder
router.get('/users/team/:teamName', auth, async (req, res) => {
  try {
    const teamName = req.params.teamName;
    const currentUser = await User.findById(req.user.id);

    // Strict Guard: Manager rules check (Managers can't snoop into other teams)
    if (currentUser.role === 'Manager' && currentUser.team !== teamName) {
      return res.status(403).json({ message: 'Cross-department data scoping is restricted.' });
    }
    
    // Find all database profiles whose assigned team matches the active browsing matrix lane context
    const teamEmployees = await User.find({ team: teamName }).select('name email role team');
    return res.json(teamEmployees);
    
  } catch (error) {
    console.error('❌ Error fetching team specific users array context:', error);
    return res.status(500).json({ message: 'Server error filtering domain workforce layers.' });
  }
});

module.exports = router;