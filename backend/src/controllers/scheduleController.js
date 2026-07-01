const { getPool } = require('../config/mysql');

const getSchedules = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [schedules] = await pool.execute(
      `SELECT * FROM download_schedules 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('获取下载计划失败:', error);
    res.status(500).json({
      success: false,
      message: '获取下载计划失败'
    });
  }
};

const createSchedule = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const {
      url,
      filename,
      schedule_type,
      schedule_time,
      schedule_day,
      schedule_date,
      priority = 5
    } = req.body;

    if (!url || !schedule_type || !schedule_time) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    const next_run_at = calculateNextRunTime(schedule_type, schedule_time, schedule_day, schedule_date);

    const [result] = await pool.execute(
      `INSERT INTO download_schedules 
       (user_id, url, filename, schedule_type, schedule_time, schedule_day, schedule_date, priority, next_run_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, url, filename, schedule_type, schedule_time, schedule_day, schedule_date, priority, next_run_at]
    );

    const [schedules] = await pool.execute(
      'SELECT * FROM download_schedules WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '下载计划创建成功',
      data: schedules[0]
    });
  } catch (error) {
    console.error('创建下载计划失败:', error);
    res.status(500).json({
      success: false,
      message: '创建下载计划失败'
    });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;
    const {
      url,
      filename,
      schedule_type,
      schedule_time,
      schedule_day,
      schedule_date,
      priority,
      status
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT * FROM download_schedules WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '下载计划不存在'
      });
    }

    const next_run_at = schedule_type && schedule_time
      ? calculateNextRunTime(schedule_type, schedule_time, schedule_day, schedule_date)
      : existing[0].next_run_at;

    await pool.execute(
      `UPDATE download_schedules SET 
       url = COALESCE(?, url),
       filename = COALESCE(?, filename),
       schedule_type = COALESCE(?, schedule_type),
       schedule_time = COALESCE(?, schedule_time),
       schedule_day = COALESCE(?, schedule_day),
       schedule_date = COALESCE(?, schedule_date),
       priority = COALESCE(?, priority),
       status = COALESCE(?, status),
       next_run_at = ?
       WHERE id = ? AND user_id = ?`,
      [url, filename, schedule_type, schedule_time, schedule_day, schedule_date, priority, status, next_run_at, id, userId]
    );

    const [schedules] = await pool.execute(
      'SELECT * FROM download_schedules WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '下载计划更新成功',
      data: schedules[0]
    });
  } catch (error) {
    console.error('更新下载计划失败:', error);
    res.status(500).json({
      success: false,
      message: '更新下载计划失败'
    });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM download_schedules WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '下载计划不存在'
      });
    }

    res.json({
      success: true,
      message: '下载计划删除成功'
    });
  } catch (error) {
    console.error('删除下载计划失败:', error);
    res.status(500).json({
      success: false,
      message: '删除下载计划失败'
    });
  }
};

const toggleSchedule = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body;

    const [existing] = await pool.execute(
      'SELECT * FROM download_schedules WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '下载计划不存在'
      });
    }

    let newStatus;
    if (action === 'pause') {
      newStatus = 'paused';
    } else if (action === 'resume') {
      newStatus = 'active';
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }

    await pool.execute(
      'UPDATE download_schedules SET status = ? WHERE id = ? AND user_id = ?',
      [newStatus, id, userId]
    );

    const [schedules] = await pool.execute(
      'SELECT * FROM download_schedules WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `下载计划${action === 'pause' ? '暂停' : '启用'}成功`,
      data: schedules[0]
    });
  } catch (error) {
    console.error('切换下载计划状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换下载计划状态失败'
    });
  }
};

const getScheduleLogs = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { schedule_id } = req.params;
    const { limit = 50 } = req.query;

    let query = `
      SELECT * FROM download_schedule_logs 
      WHERE user_id = ?
    `;
    let params = [userId];

    if (schedule_id) {
      query += ' AND schedule_id = ?';
      params.push(schedule_id);
    }

    query += ' ORDER BY executed_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [logs] = await pool.execute(query, params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取下载计划日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取下载计划日志失败'
    });
  }
};

const calculateNextRunTime = (schedule_type, schedule_time, schedule_day, schedule_date) => {
  const now = new Date();
  const [hours, minutes] = schedule_time.split(':').map(Number);
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (schedule_type) {
    case 'once':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      const dayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      const targetDay = dayMap[schedule_day.toLowerCase()] ?? 1;
      
      const currentDay = now.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      
      nextRun.setDate(now.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      const [year, month] = schedule_date.split('-').map(Number);
      nextRun.setFullYear(year, month - 1, 1);
      
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
};

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleLogs
};
