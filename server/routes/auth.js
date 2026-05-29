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

    user = new User({
      name,
      email,
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
// @desc    Fetch all corporate workforce records globally inside database registers
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: 1 });
    res.json(users);
  } catch (error) {
    console.error('❌ General user listing drop:', error);
    res.status(500).json({ message: 'Server error gathering corporate catalog listings.' });
  }
});

// ✅ ADDED: DYNAMIC SEPARATOR ROUTE CHANNEL LOOP
// @route   GET api/auth/users/team/:teamName
// @desc    Get all corporate employees belonging to a single isolated department team folder
router.get('/users/team/:teamName', auth, async (req, res) => {
  try {
    const teamName = req.params.teamName;
    
    // Find all database profiles whose assigned team matches the active browsing matrix lane context
    const teamEmployees = await User.find({ team: teamName }).select('name email role team');
    return res.json(teamEmployees);
    
  } catch (error) {
    console.error('❌ Error fetching team specific users array context:', error);
    return res.status(500).json({ message: 'Server error filtering domain workforce layers.' });
  }
});

module.exports = router;