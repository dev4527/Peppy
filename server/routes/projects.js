const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// @route    POST api/projects
// @desc     Initialize a brand new team project board branch tracking workspace
router.post('/', auth, async (req, res) => {
  const { name, description, teamCategory } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project board title is required.' });
    }

    // ⚡ EXTRACTOR PIPELINE SAFE GUARD: Resolving token user reference layers cleanly
    let finalCreatorID = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        finalCreatorID = req.user.user.id;
      } else if (typeof req.user === 'object') {
        finalCreatorID = req.user.id || req.user._id;
      } else {
        finalCreatorID = req.user;
      }
    }

    // Checking profile verification fallback logs
    if (!finalCreatorID) {
      return res.status(401).json({ message: 'User reference missing inside authentication header wrapper.' });
    }

    const currentUser = await User.findById(finalCreatorID);
    if (!currentUser) {
      return res.status(404).json({ message: 'User reference missing inside directory dataset.' });
    }

    // Force value configurations mapping standard
    let assignedTeamGroup = currentUser.role === 'Admin' ? (teamCategory || 'Technical Team') : currentUser.team;

    const newProject = new Project({
      name: name.trim(),
      description: description || '',
      teamCategory: assignedTeamGroup, 
      createdBy: finalCreatorID
    });

    const project = await newProject.save();
    console.log(`🚀 Project board [${project.name}] successfully synchronized into database column stack: ${project.teamCategory}`);
    return res.json(project);

  } catch (error) {
    console.error('Critical Project Creation Engine Drop:', error);
    return res.status(500).json({ message: 'Server deployment error inside project route execution: ' + error.message });
  }
});

// @route    GET api/projects
router.get('/', auth, async (req, res) => {
  try {
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

    const currentUser = await User.findById(targetUserId);
    
    let projects;
    if (currentUser && currentUser.role === 'Manager' && currentUser.team) {
      projects = await Project.find({ teamCategory: currentUser.team }).sort({ createdAt: -1 });
    } else {
      projects = await Project.find().sort({ createdAt: -1 });
    }

    return res.json(projects || []);
  } catch (error) {
    console.error('❌ Project fetch failure:', error);
    return res.status(500).json({ message: 'Server error parsing corporate directories.' });
  }
});

module.exports = router;