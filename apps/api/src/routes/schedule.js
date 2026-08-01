const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleLogs
} = require('../controllers/scheduleController');

router.get('/', authenticateToken, getSchedules);
router.post('/', authenticateToken, createSchedule);
router.put('/:id', authenticateToken, updateSchedule);
router.delete('/:id', authenticateToken, deleteSchedule);
router.post('/:id/toggle', authenticateToken, toggleSchedule);
router.get('/:schedule_id/logs', authenticateToken, getScheduleLogs);

module.exports = router;
