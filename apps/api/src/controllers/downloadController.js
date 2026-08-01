const { getPool } = require('../config/mysql');
const { emitDownloadProgress, emitDownloadComplete, emitDownloadFailed } = require('../config/socket');

const getDownloads = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    const [downloads] = await pool.execute(
      'SELECT * FROM downloads WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({ success: true, data: downloads });
  } catch (error) {
    console.error('获取下载记录错误:', error);
    res.status(500).json({ success: false, message: '获取下载记录失败' });
  }
};

const getDownloadById = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [downloads] = await pool.execute(
      'SELECT * FROM downloads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (downloads.length === 0) {
      return res.status(404).json({ success: false, message: '下载记录不存在' });
    }

    res.json({ success: true, data: downloads[0] });
  } catch (error) {
    console.error('获取下载记录错误:', error);
    res.status(500).json({ success: false, message: '获取下载记录失败' });
  }
};

const createDownload = async (req, res) => {
  const { userId } = req.user;
  const { url, filename } = req.body;

  if (!url || !filename) {
    return res.status(400).json({ success: false, message: 'URL和文件名都是必填项' });
  }

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      'INSERT INTO downloads (user_id, url, filename, status) VALUES (?, ?, ?, ?)',
      [userId, url, filename, 'pending']
    );

    const [downloads] = await pool.execute('SELECT * FROM downloads WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: '下载任务创建成功',
      data: downloads[0]
    });
  } catch (error) {
    console.error('创建下载记录错误:', error);
    res.status(500).json({ success: false, message: '创建下载任务失败' });
  }
};

const updateDownload = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { status, progress, downloaded_bytes, total_bytes, speed, resume_position, completed_at } = req.body;

  try {
    const pool = await getPool();
    const [downloads] = await pool.execute(
      'SELECT * FROM downloads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (downloads.length === 0) {
      return res.status(404).json({ success: false, message: '下载记录不存在或无权访问' });
    }

    const updates = [];
    const values = [];
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (progress !== undefined) { updates.push('progress = ?'); values.push(progress); }
    if (downloaded_bytes !== undefined) { updates.push('downloaded_bytes = ?'); values.push(downloaded_bytes); }
    if (total_bytes !== undefined) { updates.push('total_bytes = ?'); values.push(total_bytes); }
    if (speed !== undefined) { updates.push('speed = ?'); values.push(speed); }
    if (resume_position !== undefined) { updates.push('resume_position = ?'); values.push(resume_position); }
    if (completed_at !== undefined) { updates.push('completed_at = ?'); values.push(completed_at); }

    if (updates.length > 0) {
      values.push(id, userId);
      await pool.execute(`UPDATE downloads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }

    const [updatedDownloads] = await pool.execute('SELECT * FROM downloads WHERE id = ? AND user_id = ?', [id, userId]);
    const updatedDownload = updatedDownloads[0];

    if (status !== undefined) {
      if (status === 'completed') {
        emitDownloadComplete(userId, id, updatedDownload.filename);
      } else if (status === 'failed') {
        emitDownloadFailed(userId, id, '下载失败');
      }
    }

    if (progress !== undefined || status !== undefined) {
      emitDownloadProgress(userId, id, progress || updatedDownload.progress, status || updatedDownload.status);
    }

    res.json({
      success: true,
      message: '下载任务更新成功',
      data: updatedDownload
    });
  } catch (error) {
    console.error('更新下载记录错误:', error);
    res.status(500).json({ success: false, message: '更新下载任务失败' });
  }
};

const deleteDownload = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      'DELETE FROM downloads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '下载记录不存在或无权访问' });
    }

    res.json({ success: true, message: '下载记录删除成功' });
  } catch (error) {
    console.error('删除下载记录错误:', error);
    res.status(500).json({ success: false, message: '删除下载记录失败' });
  }
};

const clearCompletedDownloads = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    const [result] = await pool.execute(
      "DELETE FROM downloads WHERE user_id = ? AND status IN ('completed', 'cancelled')",
      [userId]
    );

    res.json({ success: true, message: `成功删除 ${result.affectedRows} 条已完成记录` });
  } catch (error) {
    console.error('清空已完成记录错误:', error);
    res.status(500).json({ success: false, message: '清空已完成记录失败' });
  }
};

module.exports = {
  getDownloads,
  getDownloadById,
  createDownload,
  updateDownload,
  deleteDownload,
  clearCompletedDownloads
};
