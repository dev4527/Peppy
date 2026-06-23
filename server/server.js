const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const initScheduler = require('./utils/scheduler'); // Background cron engine import
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 🔌 INITIALIZE WEBSOCKET PROTOCOL ENGINE WITH EXTENDED CORS RULES
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

// 📂 ENSURE LOCAL FILE UPLOADS DIRECTORY EXIST
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
    console.log('📁 Local "uploads" repository generated successfully.');
}

// Global Core Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// ✅ EXPOSE UPLOADS AS REUSEABLE STATIC ASSET GAP
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 📬 SETUP NODEMAILER EMAIL HANDSHAKE ENGINE WITH EXPLICIT SMTP POOL
const smtpConfig = {
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

if (process.env.EMAIL_SERVICE) {
  smtpConfig.service = process.env.EMAIL_SERVICE;
} else {
  smtpConfig.host = process.env.SMTP_HOST || 'smtp.gmail.com';
  smtpConfig.port = Number(process.env.SMTP_PORT || 465);
  smtpConfig.secure = process.env.SMTP_SECURE !== 'false';
}

const transporter = nodemailer.createTransport(smtpConfig);

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message || error);
  } else {
    console.log('📬 Email transporter verified and ready to send messages.');
  }
});

console.log('📬 Production Email Gateway Initialized Status: Active');

// 🚀 CONNECT TO MONGODB ATLAS & IGNITE SCHEDULER CYCLES
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🚀 Securely connected to Cloud MongoDB Atlas');
    // START BACKGROUND CRON SCHEDULER INSTANTLY ON BOOT SUCCESS
    initScheduler(); 
  })
  .catch(err => console.error('❌ MongoDB Connection Failure Error:', err));

// 🛡️ INJECT SOCKET & EMAIL OBJECTS INTO REQ STREAM PIPELINE
app.use((req, res, next) => {
  req.io = io;
  req.transporter = transporter;
  next();
});

// 🧭 REGISTER INDUSTRIAL COMPILER ROUTING HOOKS
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/ai', require('./routes/ai')); 
app.use('/api/chats', require('./routes/chats')); // Secure Database Chat Engine Module Gate
app.use('/api/notifications', require('./routes/notifications')); // ✅ ADDED: Live Workspace Notification Route Registered
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/google-workspace', require('./routes/googleWorkspace'));

// Base universal health-check tracker route
app.get('/', (req, res) => {
  res.send('📡 Peppy Tracker Master Control API Active.');
});

// 👥 WEB SOCKET CONNECTION & REAL-TIME ROUTING LISTENER LAYER
io.on('connection', (socket) => {
  console.log(`📡 New team terminal socket connected: ${socket.id}`);
  
  // Anchor user to their private channel room using their secure User ID
  socket.on('register_user', (userId) => {
    socket.join(userId);
    console.log(`👤 User securely anchored to private channel room: ${userId}`);
  });

  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`🔒 Employee secure workspace token attached to room: ${projectId}`);
  });

  socket.on('join_chat_groups', (groupIds = []) => {
    const rooms = Array.isArray(groupIds) ? groupIds : [groupIds];
    rooms.filter(Boolean).forEach((groupId) => socket.join(String(groupId)));
  });

  // Real-time dynamic point-to-point chat packet router tunnel
  socket.on('send_direct_message', (data) => {
    const { senderId, receiverId, text, _id, createdAt } = data;
    // Dispatches the socket payload instantly to the targeted receiver's room block layout
    io.to(receiverId).emit('receive_direct_message', {
      sender: senderId,
      receiver: receiverId,
      text,
      _id,
      createdAt
    });
  });

  socket.on('send_group_message', (data) => {
    const { groupId, group, sender, text, _id, createdAt } = data;
    const targetGroupId = groupId || group;

    if (!targetGroupId) return;

    socket.to(String(targetGroupId)).emit('receive_group_message', {
      group: String(targetGroupId),
      sender,
      text,
      _id,
      createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Team terminal disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`📡 Production server active on terminal port ${PORT}`);
  console.log(`🚀 System environment maps loaded. Awaiting client handshakes...`);
});
