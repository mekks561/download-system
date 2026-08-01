const express = require('express');
const router = express.Router();
const { getHealth, getMetrics, getStats } = require('../controllers/healthController');
const { authenticateToken } = require('../middleware/auth');
const schedulerService = require('../services/SchedulerService');

router.get('/health', getHealth);
router.get('/metrics', getMetrics);
router.get('/stats', authenticateToken, getStats);

// 计划任务执行器状态
router.get('/scheduler/status', (req, res) => {
  const status = schedulerService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

module.exports = router;
