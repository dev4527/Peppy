const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup'); // Secured mapping link
const auth = require('../middleware/authMiddleware');

// ==========================================
// 🚀 1. INITIALIZE PROJECT WORKSPACE
// ==========================================
router.post('/', auth, async (req, res) => {
  const { name, description, teamCategory } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project board title is required.' });
    }

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

    if (!finalCreatorID) {
      return res.status(401).json({ message: 'User reference missing inside authentication wrapper.' });
    }

    const currentUser = await User.findById(finalCreatorID);
    if (!currentUser) {
      return res.status(404).json({ message: 'User reference missing inside directory dataset.' });
    }

    let assignedTeamGroup = currentUser.role === 'Admin' ? (teamCategory || 'Technical Team') : currentUser.team;

    const newProject = new Project({
      name: name.trim(),
      description: description || '',
      teamCategory: assignedTeamGroup, 
      createdBy: finalCreatorID
    });

    const project = await newProject.save();
    console.log(`🚀 Project board [${project.name}] successfully synchronized into database.`);
    return res.json(project);

  } catch (error) {
    console.error('Critical Project Creation Engine Drop:', error);
    return res.status(500).json({ message: 'Server deployment error: ' + error.message });
  }
});

// ==========================================
// 🧭 2. FETCH FILTERED PROJECTS HIERARCHY
// ==========================================
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
    if (!currentUser) {
      return res.status(404).json({ message: 'User profile record reference missing.' });
    }

    let projects;

    // 👑 ADMIN ACCESS: Gets absolutely every project board inside the entire company
    if (currentUser.role === 'Admin') {
      projects = await Project.find().sort({ createdAt: -1 });
    } 
    
    // 🏢 MANAGER ACCESS: Filters explicitly by their own department team folder name
    else if (currentUser.role === 'Manager') {
      if (!currentUser.team) return res.json([]);
      projects = await Project.find({ 
        teamCategory: { $regex: new RegExp(`^${currentUser.team.trim()}$`, 'i') } 
      }).sort({ createdAt: -1 });
    } 
    
    // 👤 EMPLOYEE ACCESS (STRICT ISOLATION): Show project ONLY if they are active group members
    else {
      const matchingGroups = await ChatGroup.find({ members: targetUserId }).select('project');
      
      // Filter mapping fields cleanly to ignore any null discrepancies
      const approvedProjectIds = matchingGroups
        .map(g => g.project)
        .filter(p => p !== null && p !== undefined);

      // Strict enforcement: Must be explicitly whitelisted inside the allowed projects array
      projects = await Project.find({
        $and: [
          { teamCategory: { $regex: new RegExp(`^${currentUser.team?.trim() || 'Technical Team'}$`, 'i') } },
          { _id: { $in: approvedProjectIds } }
        ]
      }).sort({ createdAt: -1 });
    }

    return res.json(projects || []);
  } catch (error) {
    console.error('❌ Project fetch failure:', error);
    return res.status(500).json({ message: 'Server error parsing corporate directories.' });
  }
});

module.exports = router;