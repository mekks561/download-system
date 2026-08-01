const { getPool } = require('../config/mysql');

async function exportDownloads(req, res) {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    
    const [downloads] = await pool.query(
      'SELECT * FROM downloads WHERE user_id = ?',
      [userId]
    );
    
    const [uploads] = await pool.query(
      'SELECT * FROM uploads WHERE user_id = ?',
      [userId]
    );
    
    const [tags] = await pool.query(
      'SELECT * FROM tags WHERE user_id = ?',
      [userId]
    );
    
    const [fileTags] = await pool.query(
      'SELECT * FROM file_tags WHERE user_id = ?',
      [userId]
    );
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId,
      data: {
        downloads,
        uploads,
        tags,
        fileTags
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="download-manager-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
}

async function exportDownloadsCSV(req, res) {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    
    const [downloads] = await pool.query(
      'SELECT id, filename, url, status, file_size, created_at, completed_at FROM downloads WHERE user_id = ?',
      [userId]
    );
    
    let csv = 'ID,文件名,URL,状态,文件大小,创建时间,完成时间\n';
    downloads.forEach(d => {
      csv += `"${d.id}","${escapeCSV(d.filename)}","${escapeCSV(d.url)}","${d.status}","${formatFileSize(d.file_size)}","${d.created_at}","${d.completed_at || ''}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="downloads-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
}

async function importData(req, res) {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { data, version } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, message: '没有数据可导入' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      if (data.downloads && Array.isArray(data.downloads)) {
        for (const download of data.downloads) {
          await connection.query(
            'INSERT INTO downloads (user_id, filename, url, status, file_size, progress, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE filename = VALUES(filename), status = VALUES(status)',
            [userId, download.filename, download.url, download.status || 'pending', download.file_size || 0, download.progress || 0, download.created_at || new Date(), download.completed_at || null]
          );
        }
      }
      
      if (data.uploads && Array.isArray(data.uploads)) {
        for (const upload of data.uploads) {
          await connection.query(
            'INSERT INTO uploads (user_id, filename, status, file_size, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE filename = VALUES(filename), status = VALUES(status)',
            [userId, upload.filename, upload.status || 'pending', upload.file_size || 0, upload.created_at || new Date(), upload.completed_at || null]
          );
        }
      }
      
      if (data.tags && Array.isArray(data.tags)) {
        for (const tag of data.tags) {
          await connection.query(
            'INSERT INTO tags (user_id, name, color, description, usage_count, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE color = VALUES(color), description = VALUES(description)',
            [userId, tag.name, tag.color || '#ec4899', tag.description || '', tag.usage_count || 0, tag.created_at || new Date()]
          );
        }
      }
      
      await connection.commit();
      
      res.json({ success: true, message: '导入成功' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  exportDownloads,
  exportDownloadsCSV,
  importData
};
