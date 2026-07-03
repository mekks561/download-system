const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const {
  getDownloads,
  getDownloadById,
  createDownload,
  updateDownload,
  deleteDownload,
  clearCompletedDownloads
} = require('../controllers/downloadController');
const {
  getUploads,
  getUploadById,
  uploadFile,
  updateUpload,
  deleteUpload,
  clearCompletedUploads
} = require('../controllers/uploadController');
const scheduleRoutes = require('./schedule');
const healthRoutes = require('./health');
const shareRoutes = require('./share');
const statsRoutes = require('./stats');

// Auth routes
const authRouter = express.Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/profile', authenticateToken, getProfile);
router.use('/auth', authRouter);

router.get('/downloads', authenticateToken, getDownloads);
router.get('/downloads/:id', authenticateToken, getDownloadById);
router.post('/downloads', authenticateToken, createDownload);
router.put('/downloads/:id', authenticateToken, updateDownload);
router.delete('/downloads/:id', authenticateToken, deleteDownload);
router.delete('/downloads/clear', authenticateToken, clearCompletedDownloads);

router.get('/uploads', authenticateToken, getUploads);
router.get('/uploads/:id', authenticateToken, getUploadById);
router.post('/upload', authenticateToken, uploadFile);
router.put('/uploads/:id', authenticateToken, updateUpload);
router.delete('/uploads/:id', authenticateToken, deleteUpload);
router.delete('/uploads/clear', authenticateToken, clearCompletedUploads);

router.use('/schedules', scheduleRoutes);
router.use('/shares', shareRoutes);
router.use('/', statsRoutes);
router.use('/', healthRoutes);

module.exports = router;
