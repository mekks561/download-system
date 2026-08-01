const { getPool } = require('../config/mysql');

const getStats = async (req, res) => {
  try {
    const pool = await getPool();

    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [downloadCount] = await pool.execute('SELECT COUNT(*) as count FROM downloads');
    const [uploadCount] = await pool.execute('SELECT COUNT(*) as count FROM uploads');
    
    const today = new Date().toISOString().split('T')[0];
    const [todayDownloads] = await pool.execute(
      'SELECT COUNT(*) as count FROM downloads WHERE DATE(created_at) = ?',
      [today]
    );
    const [todayUploads] = await pool.execute(
      'SELECT COUNT(*) as count FROM uploads WHERE DATE(created_at) = ?',
      [today]
    );

    const [downloadStatusStats] = await pool.execute(
      'SELECT status, COUNT(*) as count FROM downloads GROUP BY status'
    );

    const [uploadStatusStats] = await pool.execute(
      'SELECT status, COUNT(*) as count FROM uploads GROUP BY status'
    );

    res.json({
      success: true,
      data: {
        userCount: userCount[0].count,
        downloadCount: downloadCount[0].count,
        uploadCount: uploadCount[0].count,
        todayDownloads: todayDownloads[0].count,
        todayUploads: todayUploads[0].count,
        downloadStatusStats,
        uploadStatusStats
      }
    });
  } catch (error) {
    console.error('获取GM统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
};

const getUsers = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const pool = await getPool();
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
             COALESCE(dc.download_count, 0) as downloadCount,
             COALESCE(uc.upload_count, 0) as uploadCount
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) as download_count FROM downloads GROUP BY user_id) dc ON u.id = dc.user_id
      LEFT JOIN (SELECT user_id, COUNT(*) as upload_count FROM uploads GROUP BY user_id) uc ON u.id = uc.user_id
    `;

    let params = [];

    if (search) {
      query += ' WHERE u.username LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.execute(query, params);

    const [totalResult] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const total = totalResult[0].count;

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取GM用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

const getAllDownloads = async (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;

  try {
    const pool = await getPool();
    const offset = (page - 1) * limit;

    let query = `
      SELECT d.id, d.user_id, d.url, d.filename, d.status, d.progress,
             d.downloaded_bytes, d.total_bytes, d.created_at, d.completed_at,
             u.username, u.email
      FROM downloads d
      LEFT JOIN users u ON d.user_id = u.id
    `;

    let params = [];
    let conditions = [];

    if (search) {
      conditions.push('d.filename LIKE ? OR d.url LIKE ?');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [downloads] = await pool.execute(query, params);

    const [totalResult] = await pool.execute('SELECT COUNT(*) as count FROM downloads');
    const total = totalResult[0].count;

    res.json({
      success: true,
      data: downloads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取GM下载记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取下载记录失败'
    });
  }
};

const getAllUploads = async (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;

  try {
    const pool = await getPool();
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.user_id, u.filename, u.original_filename, u.file_path,
             u.status, u.progress, u.uploaded_bytes, u.total_bytes,
             u.created_at, u.completed_at, us.username, us.email
      FROM uploads u
      LEFT JOIN users us ON u.user_id = us.id
    `;

    let params = [];
    let conditions = [];

    if (search) {
      conditions.push('u.original_filename LIKE ?');
      params.push(`%${search}%`);
    }

    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [uploads] = await pool.execute(query, params);

    const [totalResult] = await pool.execute('SELECT COUNT(*) as count FROM uploads');
    const total = totalResult[0].count;

    res.json({
      success: true,
      data: uploads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取GM上传记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取上传记录失败'
    });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();

    await pool.execute('DELETE FROM downloads WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM uploads WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除GM用户错误:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
};

module.exports = {
  getStats,
  getUsers,
  getAllDownloads,
  getAllUploads,
  deleteUser
};