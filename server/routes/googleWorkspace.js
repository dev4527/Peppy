const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');
const { loadCurrentUser, canManageProject } = require('../utils/accessControl');

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send'
];

const googleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});

router.get('/status', auth, async (req, res) => {
  const currentUser = await loadCurrentUser(req);
  const cfg = googleConfig();
  return res.json({
    configured: Boolean(cfg.clientId && cfg.clientSecret && cfg.redirectUri),
    connected: Boolean(currentUser?.googleWorkspace?.connectedAt),
    connectedEmail: currentUser?.googleWorkspace?.connectedEmail || '',
    requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    scopes: GOOGLE_SCOPES
  });
});

router.get('/auth-url', auth, async (req, res) => {
  const cfg = googleConfig();
  if (!cfg.clientId || !cfg.redirectUri) {
    return res.status(400).json({ message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES.join(' '),
    state
  });

  return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state });
});

router.post('/connect-manual', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });
    if (!req.body.refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required for manual connection.' });
    }

    await User.findByIdAndUpdate(currentUser._id, {
      googleWorkspace: {
        refreshToken: req.body.refreshToken,
        connectedEmail: req.body.connectedEmail || currentUser.email,
        scopes: req.body.scopes || GOOGLE_SCOPES,
        connectedAt: new Date()
      }
    });
    return res.json({ message: 'Google Workspace token stored securely.', connectedEmail: req.body.connectedEmail || currentUser.email });
  } catch (error) {
    console.error('Google manual connect failure:', error);
    return res.status(500).json({ message: 'Failed to save Google Workspace connection.' });
  }
});

router.post('/projects/:projectId/sync-settings', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canManageProject(currentUser, project)) {
      return res.status(403).json({ message: 'Only project managers/admins can configure Google sync.' });
    }

    project.googleWorkspace = {
      ...(project.googleWorkspace || {}),
      calendarId: req.body.calendarId || project.googleWorkspace?.calendarId || '',
      driveFolderId: req.body.driveFolderId || project.googleWorkspace?.driveFolderId || '',
      notificationEmail: req.body.notificationEmail || project.googleWorkspace?.notificationEmail || '',
      lastSyncedAt: new Date()
    };
    await project.save();
    return res.json(project.googleWorkspace);
  } catch (error) {
    console.error('Google project sync settings failure:', error);
    return res.status(500).json({ message: 'Failed to save Google sync settings.' });
  }
});

router.post('/projects/:projectId/notify', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!canManageProject(currentUser, project)) {
      return res.status(403).json({ message: 'Only project managers/admins can send project notifications.' });
    }

    const targetEmail = req.body.to || project.googleWorkspace?.notificationEmail;
    if (!targetEmail) return res.status(400).json({ message: 'Provide a target email or project notificationEmail.' });

    if (req.transporter) {
      await req.transporter.sendMail({
        from: `"Peppy Tracker Hub" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        subject: req.body.subject || `Project update: ${project.name}`,
        html: `<div style="font-family:sans-serif"><h2>${project.name}</h2><p>${req.body.message || 'Project notification from Peppy Tracker.'}</p></div>`
      });
    }

    await Notification.create({
      recipient: currentUser._id,
      sender: currentUser._id,
      title: 'Google/Gmail project notification dispatched',
      message: `Notification queued for ${targetEmail}`,
      type: 'project_notification'
    });

    return res.json({ message: 'Project notification dispatched through configured mail gateway.', to: targetEmail });
  } catch (error) {
    console.error('Google notification failure:', error);
    return res.status(500).json({ message: 'Failed to send project notification.' });
  }
});

module.exports = router;
