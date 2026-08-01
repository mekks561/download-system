const { getPool } = require('../config/mysql');
const { logger } = require('../utils/logger');

const getStats = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [downloadStats] = await pool.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed, SUM(file_size) as total_bytes FROM downloads WHERE user_id = ?',
      [userId]
    );

    const [uploadStats] = await pool.execute(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed, SUM(file_size) as total_bytes FROM uploads WHERE user_id = ?',
      [userId]
    );

    const [shareStats] = await pool.execute(
      'SELECT COUNT(*) as total_shares FROM file_shares WHERE user_id = ?',
      [userId]
    );

    const [storageUsed] = await pool.execute(
      'SELECT COALESCE(SUM(file_size), 0) as used FROM uploads WHERE user_id = ?',
      [userId]
    );

    const downloadTotal = downloadStats[0].total || 0;
    const downloadCompleted = downloadStats[0].completed || 0;
    const downloadBytes = downloadStats[0].total_bytes || 0;

    const uploadTotal = uploadStats[0].total || 0;
    const uploadCompleted = uploadStats[0].completed || 0;
    const uploadBytes = uploadStats[0].total_bytes || 0;

    res.json({
      success: true,
      data: {
        downloads: {
          total: downloadTotal,
          completed: downloadCompleted,
          totalBytes: downloadBytes,
          completionRate: downloadTotal > 0 ? Math.round((downloadCompleted / downloadTotal) * 100) : 0,
        },
        uploads: {
          total: uploadTotal,
          completed: uploadCompleted,
          totalBytes: uploadBytes,
          completionRate: uploadTotal > 0 ? Math.round((uploadCompleted / uploadTotal) * 100) : 0,
        },
        shares: {
          total: shareStats[0].total_shares || 0,
        },
        storage: {
          used: storageUsed[0].used || 0,
          total: 10 * 1024 * 1024 * 1024,
        },
      },
    });
  } catch (error) {
    logger.error('获取统计数据失败', { userId, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
    });
  }
};

const getTrendData = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { range = 'week' } = req.query;

    let days = 7;
    if (range === 'today') days = 1;
    if (range === 'month') days = 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [downloadTrend] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM downloads
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [userId, startDate.toISOString().split('T')[0]]);

    const [uploadTrend] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM uploads
      WHERE user_id = ? AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [userId, startDate.toISOString().split('T')[0]]);

    const trendMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, {
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        downloads: 0,
        uploads: 0,
      });
    }

    downloadTrend.forEach(row => {
      const entry = trendMap.get(row.date);
      if (entry) entry.downloads = row.count;
    });

    uploadTrend.forEach(row => {
      const entry = trendMap.get(row.date);
      if (entry) entry.uploads = row.count;
    });

    res.json({
      success: true,
      data: Array.from(trendMap.values()),
    });
  } catch (error) {
    logger.error('获取趋势数据失败', { userId, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取趋势数据失败',
    });
  }
};

const getFileTypeStats = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [fileTypes] = await pool.execute(`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'image'
          WHEN mime_type LIKE 'video/%' THEN 'video'
          WHEN mime_type LIKE 'audio/%' THEN 'audio'
          WHEN mime_type LIKE 'text/%' OR mime_type LIKE '%document%' THEN 'document'
          WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%rar%' OR mime_type LIKE '%tar%' THEN 'archive'
          ELSE 'other'
        END as type,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM uploads
      WHERE user_id = ?
      GROUP BY type
      ORDER BY count DESC
    `, [userId]);

    const typeNames = {
      image: '图片',
      video: '视频',
      audio: '音频',
      document: '文档',
      archive: '压缩包',
      other: '其他',
    };

    const typeColors = {
      image: '#3b82f6',
      video: '#ef4444',
      audio: '#8b5cf6',
      document: '#f59e0b',
      archive: '#10b981',
      other: '#6b7280',
    };

    const result = fileTypes.map(row => ({
      type: row.type,
      name: typeNames[row.type] || row.type,
      count: row.count,
      totalSize: row.total_size || 0,
      color: typeColors[row.type] || '#6b7280',
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取文件类型统计失败', { userId, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取文件类型统计失败',
    });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [downloads] = await pool.execute(`
      SELECT id, url, filename, status, created_at, file_size
      FROM downloads
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    const [uploads] = await pool.execute(`
      SELECT id, original_name as filename, status, created_at, file_size
      FROM uploads
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    const activities = [
      ...downloads.map(d => ({
        id: d.id,
        type: 'download',
        filename: d.filename || d.url.split('/').pop() || '未知文件',
        status: d.status,
        createdAt: d.created_at,
        size: d.file_size,
      })),
      ...uploads.map(u => ({
        id: u.id,
        type: 'upload',
        filename: u.filename,
        status: u.status,
        createdAt: u.created_at,
        size: u.file_size,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    logger.error('获取最近活动失败', { userId, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取最近活动失败',
    });
  }
};

module.exports = {
  getStats,
  getTrendData,
  getFileTypeStats,
  getRecentActivity,
};