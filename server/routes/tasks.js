const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
const {
  loadCurrentUser,
  canManageProject,
  canViewProject,
  canViewTask,
  canEditTask,
  canAssignUser
} = require('../utils/accessControl');

// 📁 ------------------------------------------------------------------
// 🚨 MULTER DISK STORAGE CONFIGURATION ENGINE FOR UNIVERSAL ATTACHMENTS
// ------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    // Ensure directory paths exist recursively before saving files
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 🚨 OPEN FILTER: Accepts absolutely any format extension stream without restriction
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 📂 Upgraded to 25MB Max Upload Stream Capacity
  },
  fileFilter: function (req, file, cb) {
    cb(null, true);
  }
});


// ==========================================
// 🧭 EXISTING SYSTEM CORE ROUTES SECTION
// ==========================================

// @route   GET api/tasks/project/:projectId
router.get('/dashboard', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'User verification mismatch during dashboard query.' });
    }

    let query;
    if (currentUser.role === 'Admin') {
      query = {};
    } else if (currentUser.role === 'Manager') {
      const projects = await Project.find({
        teamCategory: { $regex: new RegExp(`^${currentUser.team.trim()}$`, 'i') }
      }).select('_id');
      query = { project: { $in: projects.map(project => project._id) } };
    } else {
      query = {
        $or: [
          { assignedTo: currentUser._id },
          { createdBy: currentUser._id }
        ]
      };
    }

    const dashboardTasks = await Task.find(query)
      .populate('project', 'name teamCategory')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    return res.json(dashboardTasks);
  } catch (error) {
    console.error('Dashboard task retrieval failure:', error);
    return res.status(500).json({ message: 'Failed to capture dashboard task mapping.' });
  }
});

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    // Enforce visibility: Admins and project creators/managers can view all tasks.
    // Regular employees can only view tasks assigned to them.
    let currentUserId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) currentUserId = req.user.user.id;
      else if (typeof req.user === 'object') currentUserId = req.user.id || req.user._id;
      else currentUserId = req.user;
    }

    const currentUser = await loadCurrentUser(req);
    const project = await Project.findById(req.params.projectId);

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    let query = { project: req.params.projectId };

    if (!currentUser) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (!canViewProject(currentUser, project)) {
      return res.status(403).json({ message: 'You do not have access to this project.' });
    }

    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      query.$or = [
        { assignedTo: currentUser._id },
        { createdBy: currentUser._id }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    console.error('❌ Project tasks retrieval failure:', error);
    return res.status(500).json({ message: 'Failed to sync project task canvas.' });
  }
});

// @route   GET api/tasks/my-tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    let userId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        userId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        userId = req.user.id || req.user._id;
      } else {
        userId = req.user;
      }
    }

    if (!userId) {
      return res.status(401).json({ message: 'User verification mismatch during task query.' });
    }

    const myTasks = await Task.find({ assignedTo: userId })
      .populate('project', 'name teamCategory')
      .sort({ dueDate: 1 });
    return res.json(myTasks);
  } catch (error) {
    console.error('❌ Employee task pull failure:', error);
    return res.status(500).json({ message: 'Failed to capture dashboard tasks mapping.' });
  }
});

// @route   POST api/tasks
// @desc    Create a new task card safely and trigger dynamic notification emails
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name teamCategory createdBy')
      .populate('assignedTo', 'name email role team');

    if (!task) {
      return res.status(404).json({ message: 'Task asset card target not found.' });
    }

    const currentUser = await loadCurrentUser(req);
    if (!await canViewTask(currentUser, task)) {
      return res.status(403).json({ message: 'You do not have access to this task.' });
    }

    return res.json(task);
  } catch (error) {
    console.error('Task details retrieval failure:', error);
    return res.status(500).json({ message: 'Failed to load task details.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      title, description, priority, project, dueDate, assignedTo, recurrenceType,
      startDate, isMilestone, tags, estimatedMinutes, complexityScore, reviewRequired
    } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Task Title and Project target mappings are highly mandatory.' });
    }

    const currentUser = await loadCurrentUser(req);
    const targetProject = await Project.findById(project);
    if (!currentUser || !targetProject || !canViewProject(currentUser, targetProject)) {
      return res.status(403).json({ message: 'You cannot create tasks in this project.' });
    }

    let finalAssignee = assignedTo || null;
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Manager') {
      finalAssignee = currentUser._id;
    } else if (!await canAssignUser(currentUser, finalAssignee)) {
      return res.status(403).json({ message: 'You can only assign tasks within your reporting hierarchy.' });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Medium',
      project,
      dueDate: dueDate || null,
      assignedTo: finalAssignee,
      recurrenceType: recurrenceType || 'One-time task',
      createdBy: currentUser._id,
      startDate: startDate || null,
      isMilestone: Boolean(isMilestone),
      tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
      estimatedMinutes: Number(estimatedMinutes) || 0,
      complexityScore: Math.min(10, Math.max(1, Number(complexityScore) || 3)),
      review: {
        required: Boolean(reviewRequired),
        status: reviewRequired ? 'Pending' : 'Not Required',
        requestedAt: reviewRequired ? new Date() : null
      },
      activities: [{
        text: 'created this task',
        userName: currentUser.name
      }]
    });

    await newTask.save();

    if (req.io) {
      req.io.to(String(project)).emit('task_changed', { taskId: newTask._id, action: 'created' });
    }
    console.log(`🎯 New task successfully deployed: [${title}]`);

    // SAFE BOUNDARY: Only execute notification hooks if an assignee user exists
    if (finalAssignee) {
      void (async () => {
        try {
        const populatedTask = await Task.findById(newTask._id).populate('assignedTo', 'name email');

        if (populatedTask && populatedTask.assignedTo && populatedTask.assignedTo.email) {
          const targetEmail = populatedTask.assignedTo.email;

          // 1. In-app Live Notification Database entry
          const taskAlert = new Notification({
            recipient: finalAssignee,
            sender: currentUser._id,
            title: '📋 New Task Assigned',
            message: `You have been assigned a new task: "${title.trim()}" in your project roadmap deck.`,
            type: 'task_assigned'
          });
          await taskAlert.save();

          if (req.io) {
            req.io.to(String(finalAssignee)).emit('new_notification', taskAlert);
          }

          // 2. Production Mail Trigger using centralized req.transporter pipeline
          if (req.transporter) {
            const mailOptions = {
              from: `"Peppy Tracker Hub" <${process.env.EMAIL_USER}>`,
              to: targetEmail,
              subject: `📋 New Task Assigned: "${title.trim()}"`,
              html: `
                <div style="font-family: sans-serif; padding: 25px; background: #151617; color: white; border-radius: 16px; border: 1px solid #2d2e30;">
                  <h2 style="color: #4cd137; margin: 0 0 5px 0; font-size: 20px; font-weight: 900;">New Assignment Update</h2>
                  <hr style="border: 0; border-top: 1px solid #2d2e30; margin: 15px 0;" />
                  <p style="font-size: 14px; color: #cbd5e1;">Bhai, aapko ek naya task assign kiya gaya hai workspace par:</p>
                  <div style="background: #1e1f21; padding: 15px; border-left: 4px solid #4cd137; border-radius: 8px; color: white; margin: 15px 0;">
                    <strong>Title:</strong> ${title.trim()}<br/>
                    <strong>Priority:</strong> ${priority || 'Medium'}<br/>
                    <strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No Deadline'}
                  </div>
                  <p style="font-size: 12px; color: #848285;">Please check your master dashboard timeline stream layout instantly.</p>
                </div>
              `
            };
            await req.transporter.sendMail(mailOptions);
            console.log(`🚀 Assignment mail successfully dispatched to user: ${targetEmail}`);
          }
        }
      } catch (innerError) {
        console.error('⚠️ Notification/Mail branch validation bypassed safely:', innerError.message);
      }
      })();
    }

    return res.status(201).json(newTask);
  } catch (error) {
    console.error('❌ Task deployment runtime failure block:', error);
    return res.status(500).json({ message: 'Internal engine task deployment exception drop: ' + error.message });
  }
});

// @route   PUT api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      title, description, priority, status, dueDate, assignedTo, recurrenceType,
      startDate, isMilestone, tags, estimatedMinutes, actualMinutes, complexityScore, performanceScore, reviewRequired
    } = req.body;
    
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task asset card target not found.' });

    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot edit this task.' });
    }
    if (assignedTo !== undefined && !await canAssignUser(currentUser, assignedTo)) {
      return res.status(403).json({ message: 'You cannot assign this task outside your reporting hierarchy.' });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) {
      if (status === 'Completed' && task.review?.required && task.review.status !== 'Approved') {
        return res.status(403).json({ message: 'This task requires manager review approval before completion.' });
      }
      if (status === 'Review' && task.review?.required) {
        task.review.status = 'Pending';
        task.review.requestedAt = task.review.requestedAt || new Date();
      }
      task.status = status;
      task.completedAt = status === 'Completed' ? (task.completedAt || new Date()) : null;
    }
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (recurrenceType !== undefined) task.recurrenceType = recurrenceType;
    if (startDate !== undefined) task.startDate = startDate || null;
    if (isMilestone !== undefined) task.isMilestone = Boolean(isMilestone);
    if (tags !== undefined) task.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(tag => tag.trim()).filter(Boolean);
    if (estimatedMinutes !== undefined) task.estimatedMinutes = Math.max(0, Number(estimatedMinutes) || 0);
    if (actualMinutes !== undefined) task.actualMinutes = Math.max(0, Number(actualMinutes) || 0);
    if (complexityScore !== undefined) task.complexityScore = Math.min(10, Math.max(1, Number(complexityScore) || 1));
    if (performanceScore !== undefined) {
      if (!['Admin', 'Manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'Only managers and admins can set performance scores.' });
      }
      task.performanceScore = Math.min(100, Math.max(0, Number(performanceScore) || 0));
    }
    if (reviewRequired !== undefined) {
      if (!['Admin', 'Manager'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'Only managers and admins can change review requirements.' });
      }
      task.review.required = Boolean(reviewRequired);
      task.review.status = reviewRequired ? (task.review.status === 'Not Required' ? 'Pending' : task.review.status) : 'Not Required';
      task.review.requestedAt = reviewRequired ? (task.review.requestedAt || new Date()) : null;
    }

    const changedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined);
    if (changedFields.length > 0) {
      task.activities.push({
        text: `updated ${changedFields.join(', ')}`,
        userName: currentUser.name
      });
    }

    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id, updatedField: req.body });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ Task transaction update update crash:', error);
    return res.status(500).json({ message: 'Internal server task mutation breakdown loop.' });
  }
});

router.post('/:id/review', auth, async (req, res) => {
  try {
    const { decision, notes, performanceScore } = req.body;
    if (!['approve', 'reject'].includes(String(decision).toLowerCase())) {
      return res.status(400).json({ message: 'Review decision must be approve or reject.' });
    }

    const task = await Task.findById(req.params.id).populate('project', 'teamCategory createdBy sharedTeams collaborators');
    if (!task) return res.status(404).json({ message: 'Task asset card target not found.' });

    const currentUser = await loadCurrentUser(req);
    if (!canManageProject(currentUser, task.project)) {
      return res.status(403).json({ message: 'Only a manager/admin for this project can review this task.' });
    }

    const approved = String(decision).toLowerCase() === 'approve';
    task.review.required = true;
    task.review.status = approved ? 'Approved' : 'Rejected';
    task.review.reviewedAt = new Date();
    task.review.reviewedBy = currentUser._id;
    task.review.notes = notes ? String(notes).trim() : '';
    task.status = approved ? 'Completed' : 'In Progress';
    task.completedAt = approved ? new Date() : null;
    if (performanceScore !== undefined) {
      task.performanceScore = Math.min(100, Math.max(0, Number(performanceScore) || 0));
    }
    task.activities.push({
      text: `${approved ? 'approved' : 'rejected'} manager review${task.review.notes ? `: ${task.review.notes}` : ''}`,
      userName: currentUser.name
    });

    await task.save();
    if (req.io) req.io.to(task.project._id.toString()).emit('task_changed', { taskId: task._id, action: 'reviewed' });
    return res.json(task);
  } catch (error) {
    console.error('Task review workflow failure:', error);
    return res.status(500).json({ message: 'Failed to process task review.' });
  }
});


// ==========================================
// 🚀 REAL-TIME COMMENT DISCUSSION ENGINE
// ==========================================

// @route   POST api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, userName } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    
    const task = await Task.findById(req.params.id).populate('assignedTo', 'name email');
    if (!task) {
      return res.status(404).json({ message: 'Task configuration record missing.' });
    }
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot comment on this task.' });
    }

    const newComment = {
      text: text.trim(),
      userName: userName || 'Team Operator',
      timestamp: new Date()
    };

    task.comments = task.comments || [];
    task.comments.push(newComment);
    task.activities.push({
      text: 'posted a comment',
      userName: currentUser.name
    });
    await task.save();

    const failedEmails = [];

    if (req.transporter) {
      let targetList = [];
      const emailRegex = /@([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/g;
      const detectedEmails = Array.from(text.matchAll(emailRegex), match => match[1].toLowerCase());

      if (detectedEmails && detectedEmails.length > 0) {
        targetList = [...new Set(detectedEmails)];
      } else if (task.assignedTo && task.assignedTo.email) {
        targetList.push(task.assignedTo.email);
      }

      await Promise.all(targetList.map(async (email) => {
        const mailOptions = {
          from: `"Peppy Activity Stream" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `💬 New Comment Logged: "${task.title}"`,
          html: `
            <div style="font-family: sans-serif; padding: 25px; background: #151617; color: white; border-radius: 16px; border: 1px solid #2d2e30;">
              <h2 style="color: #ff4757; margin: 0 0 5px 0; font-size: 20px; font-weight: 900;">Peppy Action Activity Update</h2>
              <hr style="border: 0; border-top: 1px solid #2d2e30; margin: 15px 0;" />
              <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Bhai, <strong>${userName || 'Team Operator'}</strong> ne stream discussion block me update dala hai:</p>
              <div style="background: #1e1f21; padding: 15px; border-left: 4px solid #ff4757; border-radius: 8px; color: white; font-style: italic; font-size: 13px; margin: 15px 0;">
                "${text}"
              </div>
              <p style="font-size: 12px; color: #cbd5e1; margin-top: 15px;"><strong>Target Task Block:</strong> ${task.title}</p>
            </div>
          `
        };

        try {
          await req.transporter.sendMail(mailOptions);
          console.log(`🚀 Discussion logs mail delivered smoothly to: ${email}`);
        } catch (mailError) {
          failedEmails.push(email);
          console.error(`❌ Thread update failure tracking code loop for ${email}:`, mailError.message);
        }
      }));
    }

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json({
      ...task.toObject(),
      emailNotification: { failed: failedEmails }
    });
  } catch (error) {
    console.error('❌ Comment post mutation crash:', error);
    return res.status(500).json({ message: 'Internal server task comment drop processing exception.' });
  }
});

// @route   POST api/tasks/:id/subtasks
router.post('/:id/subtasks', auth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Subtask content parameters missing.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task asset match not found.' });
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot add subtasks to this task.' });
    }

    task.subtasks = task.subtasks || [];
    task.subtasks.push({ title: title.trim(), isCompleted: false });
    task.activities.push({
      text: `added subtask "${title.trim()}"`,
      userName: currentUser.name
    });
    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ Subtask creation cluster crash:', error);
    return res.status(500).json({ message: 'Internal engine subtask processing freeze.' });
  }
});

// @route   PUT api/tasks/:id/subtasks/:subId
router.put('/:id/subtasks/:subId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task record missing.' });
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot update this subtask.' });
    }

    const subtask = task.subtasks.id(req.params.subId);
    if (!subtask) return res.status(404).json({ message: 'Target subtask checkpoint block not found.' });

    subtask.isCompleted = !subtask.isCompleted;
    task.activities.push({
      text: `${subtask.isCompleted ? 'completed' : 'reopened'} subtask "${subtask.title}"`,
      userName: currentUser.name
    });
    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ Subtask status lane switch drop:', error);
    return res.status(500).json({ message: 'Server matrix subtask checkbox freeze error.' });
  }
});


// ==========================================
// 📁 NEW MULTI-FORMAT ATTACHMENT ENDPOINTS 
// ==========================================

// @route   POST api/tasks/:id/attach-file
// @desc    Upload documents and slides (PPT/PPTX, PDF, Doc, Images) safely
router.post('/:id/attach-file', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Binary asset document stream layer empty.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Target task frame missing.' });
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot attach files to this task.' });
    }

    const filePayload = {
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype || 'application/octet-stream'
    };

    task.attachments = task.attachments || [];
    task.attachments.push(filePayload);
    task.activities.push({
      text: `attached file "${req.file.originalname}"`,
      userName: currentUser.name
    });
    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ File stream storage mapping integration drop:', error);
    return res.status(500).json({ message: 'Internal server multer pipeline processing exception.' });
  }
});

// @route   POST api/tasks/:id/attach-link
// @desc    Inject reference web urls and enforce auto clickable hyperlinks
router.post('/:id/attach-link', auth, async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!url) return res.status(400).json({ message: 'Resource URL target path is mandatory.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Target task block configuration missing.' });
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot attach links to this task.' });
    }

    // Validate protocol structures safely to format an absolute hyperlink anchor
    const cleanHyperlink = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

    task.links = task.links || [];
    task.links.push({
      title: title || 'Workspace Resource Link',
      url: cleanHyperlink
    });
    task.activities.push({
      text: `attached link "${title || cleanHyperlink}"`,
      userName: currentUser.name
    });

    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ Web link insertion engine drop:', error);
    return res.status(500).json({ message: 'Internal engine link serialization drop.' });
  }
});

// Old endpoint compatibility fallback alias link mapping setup safely
router.post('/:id/upload', auth, upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File missing.' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    const currentUser = await loadCurrentUser(req);
    if (!await canEditTask(currentUser, task)) {
      return res.status(403).json({ message: 'You cannot upload files to this task.' });
    }

    task.attachments.push({
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype
    });
    task.activities.push({
      text: `attached file "${req.file.originalname}"`,
      userName: currentUser.name
    });
    await task.save();
    if (req.io) req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    return res.json(task);
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

module.exports = router;
