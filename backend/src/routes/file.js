const express = require('express');
const router = express.Router();
const {
  renameFile,
  deleteFile,
  batchDeleteFiles,
  getUserFiles,
  getFileInfo,
  createFolder,
  moveFile
} = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');

router.get('/files', authenticateToken, getUserFiles);
router.get('/files/:id', authenticateToken, getFileInfo);
router.put('/files/:id', authenticateToken, renameFile);
router.delete('/files/:id', authenticateToken, deleteFile);
router.post('/files/batch-delete', authenticateToken, batchDeleteFiles);
router.post('/files/folder', authenticateToken, createFolder);
router.post('/files/move', authenticateToken, moveFile);

module.exports = router;
