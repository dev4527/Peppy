const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// @route   POST api/projects
// @desc    Initialize a brand new team project board branch tracking workspace
router.post('/', auth, async (req, res) => {
  const { name, description, teamCategory } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project board title is required.' });
    }

    let finalCreatorID = req.user ? req.user.id : null;
    if (!finalCreatorID) {
      const fallbackUser = await User.findOne();
      if (fallbackUser) finalCreatorID = fallbackUser._id;
    }

    // ✅ FORCE VALUE: Direct validation of raw or parsed string arrays
    let assignedTeamGroup = 'Website Team';
    if (teamCategory) {
      assignedTeamGroup = String(teamCategory).trim();
    }

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
    return res.status(500).json({ message: 'Server deployment error inside project route execution.' });
  }
});

// @route   GET api/projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ message: 'Server error parsing corporate directories.' });
  }
});

module.exports = router;