const express = require('express');
const router = express.Router();
const { gmLogin, gmGetProfile } = require('../controllers/gmAuthController');
const { getStats, getUsers, getAllDownloads, getAllUploads, deleteUser } = require('../controllers/gmDashboardController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', gmLogin);
router.get('/profile', authenticateToken, gmGetProfile);

router.get('/stats', authenticateToken, getStats);
router.get('/users', authenticateToken, getUsers);
router.delete('/users/:id', authenticateToken, deleteUser);
router.get('/downloads', authenticateToken, getAllDownloads);
router.get('/uploads', authenticateToken, getAllUploads);

module.exports = router;