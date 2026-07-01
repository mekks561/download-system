const { getPool } = require('../config/mysql');
const cacheService = require('../services/CacheService');

const getHealth = async (req, res) => {
  try {
    const pool = await getPool();
    await pool.execute('SELECT 1');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'download-manager-api',
      version: process.env.npm_package_version || '0.1.0'
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'download-manager-api',
      error: error.message
    });
  }
};

const getMetrics = async (req, res) => {
  try {
    const pool = await getPool();
    
    const cachedMetrics = await cacheService.get(cacheService.getSystemStatsKey());
    
    let dbStats;
    if (cachedMetrics && cachedMetrics.database) {
      dbStats = cachedMetrics.database;
    } else {
      const [downloadCount] = await pool.execute('SELECT COUNT(*) as count FROM downloads');
      const [uploadCount] = await pool.execute('SELECT COUNT(*) as count FROM uploads');
      const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
      const [scheduleCount] = await pool.execute('SELECT COUNT(*) as count FROM download_schedules');
      
      dbStats = {
        downloads: downloadCount[0].count,
        uploads: uploadCount[0].count,
        users: userCount[0].count,
        schedules: scheduleCount[0].count
      };
      
      await cacheService.set(cacheService.getSystemStatsKey(), { database: dbStats }, 300);
    }
    
    const processMemory = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cache: cacheService.isAvailable(),
      metrics: {
        database: dbStats,
        system: {
          uptime: Math.floor(uptime),
          uptimeFormatted: formatUptime(uptime),
          memory: {
            rss: formatBytes(processMemory.rss),
            heapUsed: formatBytes(processMemory.heapUsed),
            heapTotal: formatBytes(processMemory.heapTotal),
            external: formatBytes(processMemory.external)
          },
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }
    });
  } catch (error) {
    console.error('获取指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取指标失败',
      error: error.message
    });
  }
};

const getStats = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    
    const cacheKey = cacheService.getUserDownloadStatsKey(userId);
    const cachedStats = await cacheService.get(cacheKey);
    
    let statsData;
    if (cachedStats) {
      statsData = cachedStats;
    } else {
      const [downloadStats] = await pool.execute(
        `SELECT status, COUNT(*) as count 
         FROM downloads 
         WHERE user_id = ? 
         GROUP BY status`,
        [userId]
      );
      
      const [scheduleStats] = await pool.execute(
        `SELECT status, COUNT(*) as count 
         FROM download_schedules 
         WHERE user_id = ? 
         GROUP BY status`,
        [userId]
      );
      
      const [recentDownloads] = await pool.execute(
        `SELECT * FROM downloads 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      );
      
      statsData = {
        downloads: downloadStats,
        schedules: scheduleStats,
        recentDownloads
      };
      
      await cacheService.set(cacheKey, statsData, 60);
    }
    
    res.json({
      success: true,
      cache: cacheService.isAvailable(),
      data: statsData
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计失败'
    });
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
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  getHealth,
  getMetrics,
  getStats
};
