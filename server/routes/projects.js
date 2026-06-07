const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
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

    let finalCreatorID = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
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
    let targetUserId = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
    if (typeof targetUserId === 'object' && targetUserId._id) {
      targetUserId = targetUserId._id;
    }

    const currentUser = await User.findById(targetUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User profile record reference missing.' });
    }

    // 👑 A. ADMIN / CEO LOOKUP: Full transparency
    if (currentUser.role === 'Admin') {
      const allProjects = await Project.find().sort({ createdAt: -1 });
      return res.json(allProjects || []);
    } 
    
    // 🏢 B. MANAGER ACCESS: Filters by creation or their team department
    if (currentUser.role === 'Manager') {
      if (!currentUser.team) return res.json([]);
      const managerProjects = await Project.find({ 
        $or: [
          { createdBy: targetUserId },
          { teamCategory: { $regex: new RegExp(`^${currentUser.team.trim()}$`, 'i') } }
        ]
      }).sort({ createdAt: -1 });
      return res.json(managerProjects || []);
    } 
    
    // 👤 C. EMPLOYEE ACCESS LAYER (RESTORED & SAFELY FILTERED):
    // Pehle we look up all groups where the employee is an explicit member
    const matchingGroups = await ChatGroup.find({ members: targetUserId }).select('project');
    const associatedProjectIds = matchingGroups.map(g => String(g.project)).filter(p => p !== 'null' && p !== 'undefined');

    // Fetch projects that belong to the employee's team AND where they are added by the Manager
    const employeeProjects = await Project.find({
      $and: [
        { teamCategory: { $regex: new RegExp(`^${currentUser.team?.trim() || 'Technical Team'}$`, 'i') } },
        { _id: { $in: associatedProjectIds } }
      ]
    }).sort({ createdAt: -1 });

    return res.json(employeeProjects || []);

  } catch (error) {
    console.error('❌ Project fetch failure:', error);
    return res.status(500).json({ message: 'Server error parsing corporate directories.' });
  }
});

module.exports = router;