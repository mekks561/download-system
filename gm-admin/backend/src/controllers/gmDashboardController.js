const { getPool } = require('../config/mysql');

const getStats = async (req, res) => {
  try {
    const pool = await getPool();
    
    const [userResult] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [downloadResult] = await pool.execute('SELECT COUNT(*) as count FROM downloads');
    const [uploadResult] = await pool.execute('SELECT COUNT(*) as count FROM uploads');
    const [scheduleResult] = await pool.execute('SELECT COUNT(*) as count FROM download_schedules');
    
    const today = new Date().toISOString().split('T')[0];
    const [todayDownloads] = await pool.execute("SELECT COUNT(*) as count FROM downloads WHERE DATE(created_at) = ?", [today]);
    const [todayUploads] = await pool.execute("SELECT COUNT(*) as count FROM uploads WHERE DATE(created_at) = ?", [today]);
    const [todayUsers] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?", [today]);
    
    const [downloadStatusStats] = await pool.execute('SELECT status, COUNT(*) as count FROM downloads GROUP BY status');
    const [uploadStatusStats] = await pool.execute('SELECT status, COUNT(*) as count FROM uploads GROUP BY status');
    const [scheduleStatusStats] = await pool.execute('SELECT status, COUNT(*) as count FROM download_schedules GROUP BY status');

    const [weeklyDownloads] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM downloads 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const [weeklyUploads] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM uploads 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        userCount: userResult[0].count,
        downloadCount: downloadResult[0].count,
        uploadCount: uploadResult[0].count,
        scheduleCount: scheduleResult[0].count,
        todayDownloads: todayDownloads[0].count,
        todayUploads: todayUploads[0].count,
        todayNewUsers: todayUsers[0].count,
        downloadStatusStats: downloadStatusStats,
        uploadStatusStats: uploadStatusStats,
        scheduleStatusStats: scheduleStatusStats,
        weeklyDownloads: weeklyDownloads,
        weeklyUploads: weeklyUploads
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const pool = await getPool();
    const { period = '7d' } = req.query;

    let interval;
    switch (period) {
      case '24h': interval = '24 HOUR'; break;
      case '7d': interval = '7 DAY'; break;
      case '30d': interval = '30 DAY'; break;
      default: interval = '7 DAY';
    }

    const [activeUsers] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const [topUsers] = await pool.execute(`
      SELECT u.id, u.username, u.email, u.created_at,
        COUNT(d.id) as download_count,
        COUNT(up.id) as upload_count,
        (COUNT(d.id) + COUNT(up.id)) as total_operations
      FROM users u
      LEFT JOIN downloads d ON u.id = d.user_id
      LEFT JOIN uploads up ON u.id = up.user_id
      WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY total_operations DESC
      LIMIT 10
    `);

    const [hourlyActivity] = await pool.execute(`
      SELECT HOUR(created_at) as hour, COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY HOUR(created_at)
      ORDER BY hour ASC
    `);

    res.json({
      success: true,
      data: {
        activeUsers,
        topUsers,
        hourlyActivity,
        period
      }
    });
  } catch (error) {
    console.error('获取用户活跃度错误:', error);
    res.status(500).json({ success: false, message: '获取用户活跃度失败' });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    const pool = await getPool();
    await pool.execute('SELECT 1');
    
    const [tableStats] = await pool.execute(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_ROWS as row_count,
        ROUND(DATA_LENGTH / 1024, 2) as data_size_kb,
        ROUND(INDEX_LENGTH / 1024, 2) as index_size_kb
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY DATA_LENGTH DESC
    `);

    const [dbSize] = await pool.execute(`
      SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as total_size_mb
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    const uptimeResult = await pool.query('SELECT NOW() as current_time, (NOW() - VARIABLE_VALUE) as uptime_seconds FROM performance_schema.global_status WHERE VARIABLE_NAME = "UPTIME"');
    const [dbUptime] = uptimeResult;

    const processMemory = process.memoryUsage();
    const processUptime = process.uptime();

    res.json({
      success: true,
      data: {
        database: {
          status: 'connected',
          tableStats,
          totalSize: dbSize[0].total_size_mb + ' MB',
          currentTime: new Date().toISOString()
        },
        application: {
          uptime: Math.floor(processUptime),
          uptimeFormatted: formatUptime(processUptime),
          memory: {
            rss: formatBytes(processMemory.rss),
            heapUsed: formatBytes(processMemory.heapUsed),
            heapTotal: formatBytes(processMemory.heapTotal)
          },
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取系统健康状态错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取系统健康状态失败',
      data: {
        database: { status: 'disconnected', error: error.message },
        application: { status: 'running' }
      }
    });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const pool = await getPool();
    const [announcements] = await pool.execute(`
      SELECT * FROM gm_announcements 
      ORDER BY is_pinned DESC, created_at DESC
    `);
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ success: false, message: '获取公告失败' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const pool = await getPool();
    const { title, content, is_pinned = false } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    const [result] = await pool.execute(
      'INSERT INTO gm_announcements (title, content, is_pinned, created_by) VALUES (?, ?, ?, ?)',
      [title, content, is_pinned, req.gmUser.id]
    );

    res.json({ 
      success: true, 
      message: '公告创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ success: false, message: '创建公告失败' });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM gm_announcements WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    res.json({ success: true, message: '公告删除成功' });
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ success: false, message: '删除公告失败' });
  }
};

const getSystemLogs = async (req, res) => {
  try {
    const pool = await getPool();
    const { limit = 100, type = 'all' } = req.query;

    let whereClause = '';
    if (type === 'error') {
      whereClause = 'WHERE status >= 400';
    } else if (type === 'warning') {
      whereClause = 'WHERE status >= 300 AND status < 400';
    }

    const [logs] = await pool.execute(`
      SELECT * FROM gm_system_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('获取系统日志错误:', error);
    res.status(500).json({ success: false, message: '获取系统日志失败' });
  }
};

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const getUsers = async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT d.id) as downloadCount,
        COUNT(DISTINCT up.id) as uploadCount
      FROM users u
      LEFT JOIN downloads d ON u.id = d.user_id
      LEFT JOIN uploads up ON u.id = up.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `);
    
    const [users] = usersResult;

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: '无效的用户ID' });
    }

    const [userResult] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [id]);
    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const username = userResult[0].username;

    await pool.execute('DELETE FROM downloads WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM uploads WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM download_schedules WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ 
      success: true, 
      message: `用户 "${username}" 已成功删除`,
      data: { userId: id, username }
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
};

const getAllDownloads = async (req, res) => {
  try {
    const downloadsResult = await pool.query(`
      SELECT 
        d.*,
        u.username,
        u.email
      FROM downloads d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
      LIMIT 100
    `);
    
    const [downloads] = downloadsResult;

    res.json({
      success: true,
      data: downloads
    });
  } catch (error) {
    console.error('获取下载记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取下载记录失败'
    });
  }
};

const getAllUploads = async (req, res) => {
  try {
    const uploadsResult = await pool.query(`
      SELECT 
        up.*,
        u.username,
        u.email
      FROM uploads up
      LEFT JOIN users u ON up.user_id = u.id
      ORDER BY up.created_at DESC
      LIMIT 100
    `);
    
    const [uploads] = uploadsResult;

    res.json({
      success: true,
      data: uploads
    });
  } catch (error) {
    console.error('获取上传记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取上传记录失败'
    });
  }
};

module.exports = {
  getStats,
  getUserActivity,
  getSystemHealth,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getSystemLogs,
  getUsers,
  getAllDownloads,
  getAllUploads,
  deleteUser
};
