const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
  send2FACode,
  verify2FACode,
  disable2FA
} = require('../../controllers/authController');
const { authenticateToken } = require('../../middleware/auth');
const {
  getDownloads,
  getDownloadById,
  createDownload,
  updateDownload,
  deleteDownload,
  clearCompletedDownloads
} = require('../../controllers/downloadController');
const {
  getUploads,
  getUploadById,
  uploadFile,
  updateUpload,
  deleteUpload,
  clearCompletedUploads
} = require('../../controllers/uploadController');
const scheduleRoutes = require('../schedule');
const healthRoutes = require('../health');
const shareRoutes = require('../share');
const fileRoutes = require('../file');

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);
router.put('/auth/profile', authenticateToken, updateProfile);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/logout', authenticateToken, logout);
router.delete('/auth/account', authenticateToken, deleteAccount);
router.post('/auth/2fa/send-code', authenticateToken, send2FACode);
router.post('/auth/2fa/verify', authenticateToken, verify2FACode);
router.post('/auth/2fa/disable', authenticateToken, disable2FA);

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
router.use('/', fileRoutes);
router.use('/', healthRoutes);

module.exports = router;