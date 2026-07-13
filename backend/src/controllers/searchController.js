const { getPool } = require('../config/mysql');

const searchDownloads = async (req, res) => {
  const { userId } = req.user;
  const { q, type, status, start, end, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

  try {
    const pool = await getPool();
    let query = 'SELECT * FROM downloads WHERE user_id = ?';
    const params = [userId];

    if (q) {
      query += ' AND (filename LIKE ? OR url LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (type) {
      const types = type.split(',').filter(Boolean);
      query += ' AND (' + types.map((t, i) => {
        switch (t) {
          case 'image': return 'mime_type LIKE ?';
          case 'video': return 'mime_type LIKE ?';
          case 'audio': return 'mime_type LIKE ?';
          case 'document': return 'mime_type LIKE ? OR mime_type LIKE ? OR mime_type LIKE ?';
          case 'archive': return 'mime_type LIKE ? OR mime_type LIKE ?';
          default: return '1=1';
        }
      }).join(' OR ') + ')';
      
      types.forEach(t => {
        switch (t) {
          case 'image': params.push('image/%'); break;
          case 'video': params.push('video/%'); break;
          case 'audio': params.push('audio/%'); break;
          case 'document': params.push('%pdf%', '%word%', '%text%'); break;
          case 'archive': params.push('%zip%', '%rar%'); break;
        }
      });
    }

    if (status) {
      const statuses = status.split(',').filter(Boolean);
      query += ' AND status IN (' + statuses.map(() => '?').join(',') + ')';
      params.push(...statuses);
    }

    if (start) {
      query += ' AND created_at >= ?';
      params.push(start);
    }

    if (end) {
      query += ' AND created_at <= ?';
      params.push(end + ' 23:59:59');
    }

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [downloads] = await pool.execute(query, params);

    const countQuery = query.replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, -2);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM downloads WHERE user_id = ?' + countQuery.slice(countQuery.indexOf('AND')), [...countParams]);

    res.json({ 
      success: true, 
      data: downloads,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('搜索下载记录错误:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

const searchUploads = async (req, res) => {
  const { userId } = req.user;
  const { q, type, status, start, end, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

  try {
    const pool = await getPool();
    let query = 'SELECT * FROM uploads WHERE user_id = ?';
    const params = [userId];

    if (q) {
      query += ' AND (original_name LIKE ? OR file_path LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (type) {
      const types = type.split(',').filter(Boolean);
      query += ' AND (' + types.map((t, i) => {
        switch (t) {
          case 'image': return 'mime_type LIKE ?';
          case 'video': return 'mime_type LIKE ?';
          case 'audio': return 'mime_type LIKE ?';
          case 'document': return 'mime_type LIKE ? OR mime_type LIKE ? OR mime_type LIKE ?';
          case 'archive': return 'mime_type LIKE ? OR mime_type LIKE ?';
          default: return '1=1';
        }
      }).join(' OR ') + ')';
      
      types.forEach(t => {
        switch (t) {
          case 'image': params.push('image/%'); break;
          case 'video': params.push('video/%'); break;
          case 'audio': params.push('audio/%'); break;
          case 'document': params.push('%pdf%', '%word%', '%text%'); break;
          case 'archive': params.push('%zip%', '%rar%'); break;
        }
      });
    }

    if (status) {
      const statuses = status.split(',').filter(Boolean);
      query += ' AND status IN (' + statuses.map(() => '?').join(',') + ')';
      params.push(...statuses);
    }

    if (start) {
      query += ' AND created_at >= ?';
      params.push(start);
    }

    if (end) {
      query += ' AND created_at <= ?';
      params.push(end + ' 23:59:59');
    }

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [uploads] = await pool.execute(query, params);

    const countQuery = query.replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, -2);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM uploads WHERE user_id = ?' + countQuery.slice(countQuery.indexOf('AND')), [...countParams]);

    res.json({ 
      success: true, 
      data: uploads,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('搜索上传记录错误:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

const searchFiles = async (req, res) => {
  const { userId } = req.user;
  const { q, type, start, end, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

  try {
    const pool = await getPool();
    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [userId];

    if (q) {
      query += ' AND (filename LIKE ? OR file_path LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    if (type) {
      const types = type.split(',').filter(Boolean);
      query += ' AND (' + types.map((t, i) => {
        switch (t) {
          case 'image': return 'mime_type LIKE ?';
          case 'video': return 'mime_type LIKE ?';
          case 'audio': return 'mime_type LIKE ?';
          case 'document': return 'mime_type LIKE ? OR mime_type LIKE ? OR mime_type LIKE ?';
          case 'archive': return 'mime_type LIKE ? OR mime_type LIKE ?';
          default: return '1=1';
        }
      }).join(' OR ') + ')';
      
      types.forEach(t => {
        switch (t) {
          case 'image': params.push('image/%'); break;
          case 'video': params.push('video/%'); break;
          case 'audio': params.push('audio/%'); break;
          case 'document': params.push('%pdf%', '%word%', '%text%'); break;
          case 'archive': params.push('%zip%', '%rar%'); break;
        }
      });
    }

    if (start) {
      query += ' AND created_at >= ?';
      params.push(start);
    }

    if (end) {
      query += ' AND created_at <= ?';
      params.push(end + ' 23:59:59');
    }

    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [files] = await pool.execute(query, params);

    const countQuery = query.replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, -2);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM files WHERE user_id = ?' + countQuery.slice(countQuery.indexOf('AND')), [...countParams]);

    res.json({ 
      success: true, 
      data: files,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('搜索文件错误:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

const globalSearch = async (req, res) => {
  const { userId } = req.user;
  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, message: '搜索关键词不能为空' });
  }

  try {
    const pool = await getPool();
    
    const [downloads] = await pool.execute(
      'SELECT id, filename as title, url as subtitle, "download" as type, created_at FROM downloads WHERE user_id = ? AND (filename LIKE ? OR url LIKE ?) LIMIT ?',
      [userId, `%${q}%`, `%${q}%`, parseInt(limit)]
    );

    const [uploads] = await pool.execute(
      'SELECT id, original_name as title, file_path as subtitle, "upload" as type, created_at FROM uploads WHERE user_id = ? AND (original_name LIKE ? OR file_path LIKE ?) LIMIT ?',
      [userId, `%${q}%`, `%${q}%`, parseInt(limit)]
    );

    const [files] = await pool.execute(
      'SELECT id, filename as title, file_path as subtitle, "file" as type, created_at FROM files WHERE user_id = ? AND (filename LIKE ? OR file_path LIKE ?) LIMIT ?',
      [userId, `%${q}%`, `%${q}%`, parseInt(limit)]
    );

    const [shares] = await pool.execute(
      'SELECT id, name as title, share_url as subtitle, "share" as type, created_at FROM file_shares WHERE user_id = ? AND (name LIKE ? OR share_url LIKE ?) LIMIT ?',
      [userId, `%${q}%`, `%${q}%`, parseInt(limit)]
    );

    const results = [...downloads, ...uploads, ...files, ...shares]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));

    res.json({ 
      success: true, 
      data: results,
      counts: {
        downloads: downloads.length,
        uploads: uploads.length,
        files: files.length,
        shares: shares.length,
        total: results.length
      }
    });
  } catch (error) {
    console.error('全局搜索错误:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

module.exports = {
  searchDownloads,
  searchUploads,
  searchFiles,
  globalSearch
};