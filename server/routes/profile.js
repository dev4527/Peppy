const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');
const { loadCurrentUser } = require('../utils/accessControl');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../private_uploads/profile-files');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

router.get('/files', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });
    return res.json(currentUser.privateFiles || []);
  } catch (error) {
    console.error('Profile files fetch failure:', error);
    return res.status(500).json({ message: 'Failed to load private files.' });
  }
});

router.post('/files', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No profile file uploaded.' });
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    currentUser.privateFiles.push({
      fileName: req.file.originalname,
      filePath: req.file.filename,
      mimeType: req.file.mimetype || 'application/octet-stream',
      note: req.body.note || ''
    });
    await currentUser.save();

    return res.status(201).json(currentUser.privateFiles[currentUser.privateFiles.length - 1]);
  } catch (error) {
    console.error('Profile file upload failure:', error);
    return res.status(500).json({ message: 'Failed to upload profile file.' });
  }
});

router.get('/files/:fileId/download', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    const file = currentUser.privateFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'Private file not found.' });

    const profileRoot = path.resolve(__dirname, '../private_uploads/profile-files');
    const localPath = path.resolve(profileRoot, file.filePath);
    if (!localPath.startsWith(profileRoot) || !fs.existsSync(localPath)) {
      return res.status(404).json({ message: 'Private file asset is missing from storage.' });
    }

    return res.download(localPath, file.fileName);
  } catch (error) {
    console.error('Profile file download failure:', error);
    return res.status(500).json({ message: 'Failed to download profile file.' });
  }
});

router.delete('/files/:fileId', auth, async (req, res) => {
  try {
    const currentUser = await loadCurrentUser(req);
    if (!currentUser) return res.status(401).json({ message: 'User not authenticated.' });

    const file = currentUser.privateFiles.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'Private file not found.' });
    const profileRoot = path.resolve(__dirname, '../private_uploads/profile-files');
    const localPath = path.resolve(profileRoot, file.filePath);
    file.deleteOne();
    await currentUser.save();
    if (localPath.startsWith(profileRoot) && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return res.json({ message: 'Private file removed.' });
  } catch (error) {
    console.error('Profile file delete failure:', error);
    return res.status(500).json({ message: 'Failed to delete profile file.' });
  }
});

module.exports = router;
