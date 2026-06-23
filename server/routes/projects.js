const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
const Task = require('../models/Task');
const auth = require('../middleware/authMiddleware');
const { loadCurrentUser, canManageProject, canViewProject } = require('../utils/accessControl');
const mongoose = require('mongoose');

// ==========================================
// 🚀 1. INITIALIZE PROJECT WORKSPACE
// ==========================================
router.post('/', auth, async (req, res) => {
  const { name, description, teamCategory, sharedTeams, collaborators, googleWorkspace } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project board title is required.' });
    }

    let finalCreatorID = req.user?.user?.id || req.user?.id || req.user?._id || req.user;
    const currentUser = await User.findById(finalCreatorID);
    if (!currentUser) {
      return res.status(404).json({ message: 'User reference missing inside directory dataset.' });
    }
    if (!['Admin', 'Manager'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Only administrators and managers can create projects.' });
    }

    let assignedTeamGroup = currentUser.role === 'Admin' ? (teamCategory || 'Technical Team') : currentUser.team;

    const newProject = new Project({
      name: name.trim(),
      description: description || '',
      teamCategory: assignedTeamGroup, 
      sharedTeams: Array.isArray(sharedTeams) ? sharedTeams.filter(Boolean) : [],
      collaborators: Array.isArray(collaborators) ? collaborators.filter(Boolean) : [],
      googleWorkspace: googleWorkspace || {},
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
          { teamCategory: { $regex: new RegExp(`^${currentUser.team.trim()}$`, 'i') } },
          { sharedTeams: { $regex: new RegExp(`^${currentUser.team.trim()}$`, 'i') } },
          { collaborators: targetUserId }
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
        { sharedTeams: { $regex: new RegExp(`^${(currentUser.team || 'Technical Team').trim()}$`, 'i') } },
        { collaborators: targetUserId },
        { _id: { $in: associatedProjectIds } }
      ]
    }).sort({ createdAt: -1 });

    return res.json(employeeProjects || []);

  } catch (error) {
    console.error('❌ Project fetch failure:', error);
    return res.status(500).json({ message: 'Server error parsing corporate directories.' });
  }
});

router.put('/:id/collaboration', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canManageProject(currentUser, project)) {
      return res.status(403).json({ message: 'Only project managers/admins can update collaboration settings.' });
    }

    const { sharedTeams, collaborators, googleWorkspace } = req.body;
    if (sharedTeams !== undefined) {
      project.sharedTeams = Array.isArray(sharedTeams)
        ? sharedTeams.map(team => String(team).trim()).filter(Boolean)
        : String(sharedTeams).split(',').map(team => team.trim()).filter(Boolean);
    }
    if (collaborators !== undefined) {
      project.collaborators = Array.isArray(collaborators) ? collaborators.filter(Boolean) : [];
    }
    if (googleWorkspace !== undefined) {
      project.googleWorkspace = {
        ...(project.googleWorkspace || {}),
        ...googleWorkspace
      };
    }
    await project.save();
    return res.json(project);
  } catch (error) {
    console.error('Project collaboration update failure:', error);
    return res.status(500).json({ message: 'Failed to update collaboration settings.' });
  }
});

router.post('/:id/clone', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    const sourceProject = await Project.findById(req.params.id);
    if (!sourceProject) return res.status(404).json({ message: 'Source project not found.' });
    if (!canViewProject(currentUser, sourceProject)) {
      return res.status(403).json({ message: 'You cannot clone a project you cannot view.' });
    }
    if (!['Admin', 'Manager'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Only administrators and managers can clone projects.' });
    }

    const clonedProject = await Project.create({
      name: req.body.name?.trim() || `${sourceProject.name} Copy`,
      description: req.body.description ?? sourceProject.description,
      teamCategory: req.body.teamCategory || sourceProject.teamCategory,
      sharedTeams: req.body.sharedTeams || sourceProject.sharedTeams || [],
      collaborators: req.body.collaborators || sourceProject.collaborators || [],
      googleWorkspace: req.body.googleWorkspace || {},
      clonedFrom: sourceProject._id,
      createdBy: currentUser._id
    });

    const shouldCloneTasks = req.body.cloneTasks !== false;
    let clonedTasks = [];
    if (shouldCloneTasks) {
      const sourceTasks = await Task.find({ project: sourceProject._id }).lean();
      const taskCopies = sourceTasks.map(task => {
        const {
          _id, createdAt, updatedAt, comments, activities, attachments, links,
          completedAt, actualMinutes, review, performanceScore, ...copyable
        } = task;
        return {
          ...copyable,
          project: clonedProject._id,
          status: 'To Do',
          completedAt: null,
          actualMinutes: 0,
          performanceScore: 0,
          review: {
            required: review?.required || false,
            status: review?.required ? 'Pending' : 'Not Required',
            requestedAt: review?.required ? new Date() : null,
            reviewedAt: null,
            reviewedBy: null,
            notes: ''
          },
          comments: [],
          activities: [{
            text: `cloned from project "${sourceProject.name}"`,
            userName: currentUser.name,
            timestamp: new Date()
          }],
          attachments: req.body.cloneAttachments ? (attachments || []) : [],
          links: links || [],
          createdBy: currentUser._id
        };
      });
      clonedTasks = taskCopies.length ? await Task.insertMany(taskCopies) : [];
    }

    return res.status(201).json({ project: clonedProject, clonedTaskCount: clonedTasks.length });
  } catch (error) {
    console.error('Project clone failure:', error);
    return res.status(500).json({ message: 'Failed to clone project: ' + error.message });
  }
});

module.exports = router;
