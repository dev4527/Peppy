const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
const auth = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

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
    // If request asked to auto-create a chat group for this project, create it
    const { createGroup, groupMembers, groupDescription } = req.body;
    if (createGroup) {
      try {
        const membersList = groupMembers ? (typeof groupMembers === 'string' ? JSON.parse(groupMembers) : groupMembers) : [];
        // ensure creator is included
        const creatorIdStr = String(finalCreatorID);
        if (!membersList.map(m => String(m)).includes(creatorIdStr)) membersList.push(finalCreatorID);

        const newGroup = new ChatGroup({
          name: `${project.name} Sync Group`,
          description: groupDescription || `Auto-generated group for project ${project.name}`,
          teamScope: project.teamCategory || 'Global',
          members: membersList,
          createdBy: finalCreatorID,
          project: project._id
        });
        await newGroup.save();
        console.log(`💬 Auto-created chat group for project [${project.name}]`);
      } catch (grpErr) {
        console.error('❌ Failed to auto-create project chat group:', grpErr.message);
      }
    }

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
    
    // 👤 C. EMPLOYEE ACCESS LAYER (HYBRID SAFE FALLBACK):
    // Amit ko uske team category (Technical Team) ke saare projects milenge, 
    // PLUS agar use kisi explicit project sync group ka member banaya hai toh wo bhi fetch hoga.
    const userObjId = mongoose.Types.ObjectId.isValid(targetUserId) ? new mongoose.Types.ObjectId(targetUserId) : targetUserId;
    
    // Find all groups where employee is listed as a member (Using dynamic casting or raw matching)
    const matchingGroups = await ChatGroup.find({
      $or: [
        { members: targetUserId },
        { members: userObjId }
      ]
    }).select('project');

    const associatedProjectIds = matchingGroups
      .map(g => g.project ? String(g.project) : null)
      .filter(p => p && p !== 'null' && p !== 'undefined');

    const employeeProjects = await Project.find({
      $or: [
        { teamCategory: { $regex: new RegExp(`^${(currentUser.team || 'Technical Team').trim()}$`, 'i') } },
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