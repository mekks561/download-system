const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStats,
  getTrendData,
  getFileTypeStats,
  getRecentActivity,
} = require('../controllers/statsController');

router.get('/stats', authenticateToken, getStats);
router.get('/stats/trend', authenticateToken, getTrendData);
router.get('/stats/file-types', authenticateToken, getFileTypeStats);
router.get('/stats/activities', authenticateToken, getRecentActivity);

module.exports = router;