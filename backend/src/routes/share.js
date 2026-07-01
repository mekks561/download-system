const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createShare,
  getMyShares,
  deleteShare,
  accessShare,
  downloadShare,
  getShareStats
} = require('../controllers/shareController');

router.post('/shares', authenticateToken, createShare);
router.get('/shares', authenticateToken, getMyShares);
router.get('/shares/stats', authenticateToken, getShareStats);
router.delete('/shares/:id', authenticateToken, deleteShare);

router.get('/shares/:token', accessShare);
router.post('/shares/:token/download', downloadShare);

module.exports = router;
