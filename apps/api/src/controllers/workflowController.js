const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/mysql');

const getWorkflows = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    const [workflows] = await pool.execute(
      'SELECT * FROM workflows WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('获取工作流错误:', error);
    res.status(500).json({ success: false, message: '获取工作流失败' });
  }
};

const getWorkflowById = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [workflows] = await pool.execute(
      'SELECT * FROM workflows WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (workflows.length === 0) {
      return res.status(404).json({ success: false, message: '工作流不存在或无权访问' });
    }

    res.json({ success: true, data: workflows[0] });
  } catch (error) {
    console.error('获取工作流错误:', error);
    res.status(500).json({ success: false, message: '获取工作流失败' });
  }
};

const createWorkflow = async (req, res) => {
  const { userId } = req.user;
  const { name, description, trigger_type, trigger_config, conditions, actions, enabled } = req.body;

  if (!name || !trigger_type || !actions || !Array.isArray(actions)) {
    return res.status(400).json({ success: false, message: '工作流名称、触发器类型和动作都是必填项' });
  }

  try {
    const pool = await getPool();
    const id = uuidv4();

    const [result] = await pool.execute(
      'INSERT INTO workflows (id, user_id, name, description, trigger_type, trigger_config, conditions, actions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        userId,
        name,
        description || null,
        JSON.stringify(trigger_config || {}),
        JSON.stringify(conditions || []),
        JSON.stringify(actions),
        enabled !== undefined ? enabled : 1
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: '创建工作流失败' });
    }

    const [workflows] = await pool.execute('SELECT * FROM workflows WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      message: '工作流创建成功',
      data: workflows[0]
    });
  } catch (error) {
    console.error('创建工作流错误:', error);
    res.status(500).json({ success: false, message: '创建工作流失败' });
  }
};

const updateWorkflow = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { name, description, trigger_type, trigger_config, conditions, actions, enabled } = req.body;

  try {
    const pool = await getPool();
    const [workflows] = await pool.execute(
      'SELECT * FROM workflows WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (workflows.length === 0) {
      return res.status(404).json({ success: false, message: '工作流不存在或无权访问' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (trigger_type !== undefined) { updates.push('trigger_type = ?'); values.push(trigger_type); }
    if (trigger_config !== undefined) { updates.push('trigger_config = ?'); values.push(JSON.stringify(trigger_config)); }
    if (conditions !== undefined) { updates.push('conditions = ?'); values.push(JSON.stringify(conditions)); }
    if (actions !== undefined) { updates.push('actions = ?'); values.push(JSON.stringify(actions)); }
    if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有提供更新字段' });
    }

    values.push(id, userId);
    await pool.execute(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);

    const [updatedWorkflows] = await pool.execute('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({
      success: true,
      message: '工作流更新成功',
      data: updatedWorkflows[0]
    });
  } catch (error) {
    console.error('更新工作流错误:', error);
    res.status(500).json({ success: false, message: '更新工作流失败' });
  }
};

const deleteWorkflow = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      'DELETE FROM workflows WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '工作流不存在或无权访问' });
    }

    res.json({ success: true, message: '工作流删除成功' });
  } catch (error) {
    console.error('删除工作流错误:', error);
    res.status(500).json({ success: false, message: '删除工作流失败' });
  }
};

const toggleWorkflow = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [workflows] = await pool.execute(
      'SELECT * FROM workflows WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (workflows.length === 0) {
      return res.status(404).json({ success: false, message: '工作流不存在或无权访问' });
    }

    const newEnabled = workflows[0].enabled ? 0 : 1;

    await pool.execute(
      'UPDATE workflows SET enabled = ? WHERE id = ? AND user_id = ?',
      [newEnabled, id, userId]
    );

    const [updatedWorkflows] = await pool.execute('SELECT * FROM workflows WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({
      success: true,
      message: newEnabled ? '工作流已启用' : '工作流已禁用',
      data: updatedWorkflows[0]
    });
  } catch (error) {
    console.error('切换工作流状态错误:', error);
    res.status(500).json({ success: false, message: '切换工作流状态失败' });
  }
};

const getWorkflowExecutions = async (req, res) => {
  const { userId } = req.user;
  const { workflowId } = req.query;

  try {
    const pool = await getPool();
    let query = 'SELECT * FROM workflow_executions WHERE user_id = ? ORDER BY started_at DESC';
    const values = [userId];

    if (workflowId) {
      query = 'SELECT * FROM workflow_executions WHERE user_id = ? AND workflow_id = ? ORDER BY started_at DESC';
      values.push(workflowId);
    }

    const [executions] = await pool.execute(query, values);

    res.json({ success: true, data: executions });
  } catch (error) {
    console.error('获取工作流执行日志错误:', error);
    res.status(500).json({ success: false, message: '获取工作流执行日志失败' });
  }
};

module.exports = {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  getWorkflowExecutions
};