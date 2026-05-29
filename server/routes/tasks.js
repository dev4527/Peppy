const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');

// 📧 ------------------------------------------------------------------
//🚨 NODEMAILER TRANSPORTER INITIALIZATION NODE (Use App Passwords)
// ------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-startup-email@gmail.com', 
    pass: process.env.EMAIL_PASS || 'your-app-password-here'
  }
});

// 📁 ------------------------------------------------------------------
// 🚨 MULTER DISK STORAGE CONFIGURATION ENGINE FOR FILE ATTACHMENTS
// ------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads');
    // Ensure directory paths exist recursively before saving files
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// ==========================================
// 🧭 EXISTING SYSTEM CORE ROUTES SECTION
// ==========================================

// @route   GET api/tasks/project/:projectId
// @desc    Get all tasks linked to a specific project workspace board
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    console.error('❌ Project tasks retrieval failure:', error);
    return res.status(500).json({ message: 'Failed to sync project task canvas.' });
  }
});

// @route   GET api/tasks/my-tasks
// @desc    Get all active tasks assigned specifically to the logged-in user
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
// @desc    Create a new task card, trigger automated notifications, and emit websocket packets
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, project, dueDate, assignedTo, recurrenceType } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Task Title and Project target mappings are highly mandatory.' });
    }

    let creatorId = null;
    if (req.user) {
      if (req.user.user && req.user.user.id) {
        creatorId = req.user.user.id;
      } else if (typeof req.user === 'object') {
        creatorId = req.user.id || req.user._id;
      } else {
        creatorId = req.user;
      }
    }

    if (!creatorId) {
      return res.status(401).json({ message: 'Creator authentication context lost.' });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Medium',
      project,
      dueDate,
      assignedTo: assignedTo || null,
      recurrenceType: recurrenceType || 'One-time task',
      createdBy: creatorId
    });

    await newTask.save();
    console.log(`🎯 New task successfully deployed: [${title}]`);

    if (assignedTo) {
      const taskAlert = new Notification({
        recipient: assignedTo,
        sender: creatorId,
        title: '📋 New Task Assigned',
        message: `You have been assigned a new task: "${title.trim()}" in your project roadmap deck.`,
        type: 'task_assigned'
      });

      await taskAlert.save();

      if (req.io) {
        req.io.to(assignedTo).emit('new_notification', taskAlert);
      }
    }

    return res.status(201).json(newTask);
  } catch (error) {
    console.error('❌ Task deployment runtime failure block:', error);
    return res.status(500).json({ message: 'Internal engine task deployment exception drop: ' + error.message });
  }
});

// @route   PUT api/tasks/:id
// @desc    Update an existing task configuration or advance its status lane process
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, assignedTo, recurrenceType } = req.body;
    
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task asset card target not found.' });

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (recurrenceType !== undefined) task.recurrenceType = recurrenceType;

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


// ==========================================
// 🚀 NEW UPGRADED DYNAMIC FUNCTIONAL endpoints
// ==========================================

// @route   POST api/tasks/:id/comments
// @desc    Add collaborative activity note and trigger automatic @email help alerts
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, userName } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task configuration record missing.' });
    }

    const newComment = {
      text: text.trim(),
      userName: userName || 'Team Operator',
      timestamp: new Date()
    };

    // Push new comment chunk into schema array parameters
    task.comments = task.comments || [];
    task.comments.push(newComment);
    await task.save();

    // 🔍 AUTOMATED REGEX EXTRACTION OF @EMAILS FROM INPUT LOGS
    const emailRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
    const detectedEmails = text.match(emailRegex);

    if (detectedEmails && detectedEmails.length > 0) {
      // Strips leading '@' character to isolate pure email targets
      const isolatedEmails = detectedEmails.map(m => m.substring(1));

      isolatedEmails.forEach(async (email) => {
        const mailOptions = {
          from: '"Peppy Tracker Helpdesk" <your-startup-email@gmail.com>',
          to: email,
          subject: `🚨 Urgent Help Requested: "${task.title}"`,
          html: `
            <div style="font-family: sans-serif; padding: 25px; background: #151617; color: white; border-radius: 16px; border: 1px solid #2d2e30;">
              <h2 style="color: #ff4757; margin: 0 0 5px 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">Peppy Tracker Automated Alert</h2>
              <p style="font-size: 10px; color: #848285; text-transform: uppercase; margin: 0; font-weight: bold; letter-spacing: 1px;">Live Operational Hub Broadcast</p>
              <hr style="border: 0; border-top: 1px solid #2d2e30; margin: 15px 0;" />
              <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Bhai, <strong>${userName || 'Team Operator'}</strong> ne task stream activity panel me help maangi hai aur aapko tag kiya hai:</p>
              <div style="background: #1e1f21; padding: 15px; border-left: 4px solid #ff4757; border-radius: 8px; color: white; font-style: italic; font-size: 13px; margin: 15px 0;">
                "${text}"
              </div>
              <p style="font-size: 12px; color: #cbd5e1; margin-top: 15px;"><strong>Target Active Task:</strong> ${task.title}</p>
              <hr style="border: 0; border-top: 1px solid #2d2e30; margin: 15px 0;" />
              <p style="font-size: 10px; color: #ff4757; font-weight: bold; margin: 0;">⚠️ Please jump on the production sprint board workspace immediately.</p>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`🚀 Automated Help mail dispatched smoothly to: ${email}`);
        } catch (mailError) {
          console.error(`❌ Mail distribution chain exception for ${email}:`, mailError);
        }
      });
    }

    // Trigger instant global workspace re-fetch broadcast sync packets
    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ Comment post mutation crash:', error);
    return res.status(500).json({ message: 'Internal server task comment drop processing exception.' });
  }
});

// @route   POST api/tasks/:id/subtasks
// @desc    Inject a nested actionable checkpoint item into a target task document boundary
router.post('/:id/subtasks', auth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Subtask content parameters missing.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task asset match not found.' });

    task.subtasks = task.subtasks || [];
    task.subtasks.push({ title: title.trim(), isCompleted: false });
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
// @desc    Toggle check/uncheck status condition matrix of a nested item lifecycle lane
router.put('/:id/subtasks/:subId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task record missing.' });

    const subtask = task.subtasks.id(req.params.subId);
    if (!subtask) return res.status(404).json({ message: 'Target subtask checkpoint block not found.' });

    // Inverse current state boolean values smoothly
    subtask.isCompleted = !subtask.isCompleted;
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

// @route   POST api/tasks/:id/upload
// @desc    Handle form binary uploads streams via multer layers and update document file arrays
router.post('/:id/upload', auth, upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Binary asset document stream layer empty.' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Target task frame missing.' });

    const filePayload = {
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}` // Relative serving directory mapping parameter link
    };

    task.attachments = task.attachments || [];
    task.attachments.push(filePayload);
    await task.save();

    if (req.io) {
      req.io.to(task.project.toString()).emit('task_changed', { taskId: task._id });
    }

    return res.json(task);
  } catch (error) {
    console.error('❌ File stream pipeline integration drop:', error);
    return res.status(500).json({ message: 'Internal server multer pipeline processing exception.' });
  }
});

module.exports = router;