const express = require('express');
const router = express.Router();
const {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  getWorkflowExecutions
} = require('../controllers/workflowController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, getWorkflows);
router.get('/:id', authenticateToken, getWorkflowById);
router.post('/', authenticateToken, createWorkflow);
router.put('/:id', authenticateToken, updateWorkflow);
router.delete('/:id', authenticateToken, deleteWorkflow);
router.post('/:id/toggle', authenticateToken, toggleWorkflow);
router.get('/executions', authenticateToken, getWorkflowExecutions);

module.exports = router;