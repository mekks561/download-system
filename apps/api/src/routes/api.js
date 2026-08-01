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
const {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  addTagsToFile,
  removeTagsFromFile,
  getFileTags,
  searchByTag
} = require('../controllers/tagController');
const {
  exportDownloads,
  exportDownloadsCSV,
  importData
} = require('../controllers/exportController');
const {
  previewFile,
  downloadFile,
  getDownloadedFiles
} = require('../controllers/fileController');
const scheduleRoutes = require('./schedule');
const healthRoutes = require('./health');
const shareRoutes = require('./share');
const statsRoutes = require('./stats');
const searchRoutes = require('./search');
const workflowRoutes = require('./workflow');

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
router.use('/workflows', workflowRoutes);
router.use('/', statsRoutes);
router.use('/', healthRoutes);
router.use('/', searchRoutes);

router.get('/tags', authenticateToken, getTags);
router.post('/tags', authenticateToken, createTag);
router.get('/tags/search', authenticateToken, searchByTag);
router.get('/tags/:fileId/:fileType', authenticateToken, getFileTags);
router.post('/tags/:fileId/:fileType/add', authenticateToken, addTagsToFile);
router.post('/tags/:fileId/:fileType/remove', authenticateToken, removeTagsFromFile);
router.get('/tags/:id', authenticateToken, getTagById);
router.put('/tags/:id', authenticateToken, updateTag);
router.delete('/tags/:id', authenticateToken, deleteTag);

router.get('/export/downloads', authenticateToken, exportDownloads);
router.get('/export/downloads/csv', authenticateToken, exportDownloadsCSV);
router.post('/import', authenticateToken, importData);

router.get('/files/preview', authenticateToken, previewFile);
router.get('/files/download', authenticateToken, downloadFile);
router.get('/files/downloaded', authenticateToken, getDownloadedFiles);

module.exports = router;
