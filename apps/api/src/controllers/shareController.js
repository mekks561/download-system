const { getPool } = require('../config/mysql');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const createShare = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { upload_id, password, expires_in_hours = 24, max_downloads = 10 } = req.body;

    if (!upload_id) {
      return res.status(400).json({
        success: false,
        message: '请选择要分享的文件'
      });
    }

    const [uploads] = await pool.execute(
      'SELECT * FROM uploads WHERE id = ? AND user_id = ?',
      [upload_id, userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在或无权分享'
      });
    }

    const shareToken = crypto.randomBytes(32).toString('hex');
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    
    const expiresAt = expires_in_hours > 0
      ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000)
      : null;

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken}`;

    const [result] = await pool.execute(
      `INSERT INTO file_shares 
       (user_id, upload_id, share_token, share_url, password, expires_at, max_downloads)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, upload_id, shareToken, shareUrl, hashedPassword, expiresAt, max_downloads]
    );

    const [shares] = await pool.execute(
      'SELECT * FROM file_shares WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '分享链接创建成功',
      data: {
        id: shares[0].id,
        share_token: shareToken,
        share_url: shareUrl,
        has_password: !!password,
        expires_at: expiresAt,
        max_downloads,
        created_at: shares[0].created_at
      }
    });
  } catch (error) {
    console.error('创建分享失败:', error);
    res.status(500).json({
      success: false,
      message: '创建分享失败'
    });
  }
};

const getMyShares = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [shares] = await pool.execute(
      `SELECT fs.*, u.original_name, u.file_size, u.mime_type
       FROM file_shares fs
       JOIN uploads u ON fs.upload_id = u.id
       WHERE fs.user_id = ?
       ORDER BY fs.created_at DESC`,
      [userId]
    );

    shares.forEach(share => {
      if (share.password) share.password = undefined;
    });

    res.json({
      success: true,
      data: shares
    });
  } catch (error) {
    console.error('获取分享列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分享列表失败'
    });
  }
};

const deleteShare = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM file_shares WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或无权删除'
      });
    }

    res.json({
      success: true,
      message: '分享已删除'
    });
  } catch (error) {
    console.error('删除分享失败:', error);
    res.status(500).json({
      success: false,
      message: '删除分享失败'
    });
  }
};

const toggleShare = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;

    const [shares] = await pool.execute(
      'SELECT id, is_active FROM file_shares WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (shares.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或无权操作'
      });
    }

    const newStatus = !shares[0].is_active;

    await pool.execute(
      'UPDATE file_shares SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: newStatus ? '分享已启用' : '分享已禁用',
      data: {
        is_active: newStatus
      }
    });
  } catch (error) {
    console.error('切换分享状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换分享状态失败'
    });
  }
};

const updateShare = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    const { id } = req.params;
    const { password, expires_in_hours, max_downloads } = req.body;

    const [shares] = await pool.execute(
      'SELECT * FROM file_shares WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (shares.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或无权操作'
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (password !== undefined) {
      const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }

    if (expires_in_hours !== undefined) {
      const expiresAt = expires_in_hours > 0
        ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000)
        : null;
      updateFields.push('expires_at = ?');
      updateValues.push(expiresAt);
    }

    if (max_downloads !== undefined) {
      updateFields.push('max_downloads = ?');
      updateValues.push(max_downloads);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的字段'
      });
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE file_shares SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedShares] = await pool.execute(
      'SELECT fs.*, u.original_name, u.file_size FROM file_shares fs JOIN uploads u ON fs.upload_id = u.id WHERE fs.id = ?',
      [id]
    );

    if (updatedShares[0]) {
      updatedShares[0].password = undefined;
    }

    res.json({
      success: true,
      message: '分享设置已更新',
      data: updatedShares[0]
    });
  } catch (error) {
    console.error('更新分享失败:', error);
    res.status(500).json({
      success: false,
      message: '更新分享失败'
    });
  }
};

const accessShare = async (req, res) => {
  try {
    const pool = await getPool();
    const { token } = req.params;
    const { password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    const [shares] = await pool.execute(
      `SELECT fs.*, u.original_name, u.file_size, u.mime_type, u.file_path, u.id as upload_id
       FROM file_shares fs
       JOIN uploads u ON fs.upload_id = u.id
       WHERE fs.share_token = ? AND fs.is_active = 1`,
      [token]
    );

    if (shares.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或已失效'
      });
    }

    const share = shares[0];

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        message: '分享链接已过期'
      });
    }

    if (share.max_downloads > 0 && share.download_count >= share.max_downloads) {
      return res.status(410).json({
        success: false,
        message: '下载次数已用尽'
      });
    }

    if (share.password) {
      if (!password) {
        return res.json({
          success: true,
          requires_password: true,
          message: '请输入访问密码'
        });
      }

      const isValidPassword = await bcrypt.compare(password, share.password);
      if (!isValidPassword) {
        await pool.execute(
          `INSERT INTO file_share_access_logs (share_id, ip_address, user_agent, access_type)
           VALUES (?, ?, ?, 'view')`,
          [share.id, clientIp, userAgent]
        );

        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    await pool.execute(
      `INSERT INTO file_share_access_logs (share_id, ip_address, user_agent, access_type)
       VALUES (?, ?, ?, 'view')`,
      [share.id, clientIp, userAgent]
    );

    await pool.execute(
      'UPDATE file_shares SET view_count = view_count + 1 WHERE id = ?',
      [share.id]
    );

    const fileExists = fs.existsSync(share.file_path);

    res.json({
      success: true,
      data: {
        id: share.id,
        original_name: share.original_name,
        file_size: share.file_size,
        mime_type: share.mime_type,
        requires_password: !!share.password,
        is_available: fileExists && (share.max_downloads === 0 || share.download_count < share.max_downloads),
        expires_at: share.expires_at,
        remaining_downloads: share.max_downloads > 0 ? share.max_downloads - share.download_count : -1
      }
    });
  } catch (error) {
    console.error('访问分享失败:', error);
    res.status(500).json({
      success: false,
      message: '访问分享失败'
    });
  }
};

const downloadShare = async (req, res) => {
  try {
    const pool = await getPool();
    const { token } = req.params;
    const { password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    const [shares] = await pool.execute(
      `SELECT fs.*, u.original_name, u.file_size, u.mime_type, u.file_path
       FROM file_shares fs
       JOIN uploads u ON fs.upload_id = u.id
       WHERE fs.share_token = ? AND fs.is_active = 1`,
      [token]
    );

    if (shares.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或已失效'
      });
    }

    const share = shares[0];

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        message: '分享链接已过期'
      });
    }

    if (share.max_downloads > 0 && share.download_count >= share.max_downloads) {
      return res.status(410).json({
        success: false,
        message: '下载次数已用尽'
      });
    }

    if (share.password) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '请输入访问密码'
        });
      }

      const isValidPassword = await bcrypt.compare(password, share.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }
    }

    if (!fs.existsSync(share.file_path)) {
      return res.status(404).json({
        success: false,
        message: '文件已被删除或不存在'
      });
    }

    await pool.execute(
      `INSERT INTO file_share_access_logs (share_id, ip_address, user_agent, access_type)
       VALUES (?, ?, ?, 'download')`,
      [share.id, clientIp, userAgent]
    );

    await pool.execute(
      'UPDATE file_shares SET download_count = download_count + 1 WHERE id = ?',
      [share.id]
    );

    res.download(share.file_path, share.original_name);
  } catch (error) {
    console.error('下载分享文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载分享文件失败'
    });
  }
};

const getShareStats = async (req, res) => {
  try {
    const pool = await getPool();
    const userId = req.user.id;

    const [totalShares] = await pool.execute(
      'SELECT COUNT(*) as count FROM file_shares WHERE user_id = ?',
      [userId]
    );

    const [activeShares] = await pool.execute(
      'SELECT COUNT(*) as count FROM file_shares WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    const [totalDownloads] = await pool.execute(
      'SELECT SUM(download_count) as total FROM file_shares WHERE user_id = ?',
      [userId]
    );

    const [recentAccess] = await pool.execute(
      `SELECT fsal.*, fs.share_token, u.original_name
       FROM file_share_access_logs fsal
       JOIN file_shares fs ON fsal.share_id = fs.id
       JOIN uploads u ON fs.upload_id = u.id
       WHERE fs.user_id = ?
       ORDER BY fsal.accessed_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        totalShares: totalShares[0].count,
        activeShares: activeShares[0].count,
        totalDownloads: totalDownloads[0].total || 0,
        recentAccess
      }
    });
  } catch (error) {
    console.error('获取分享统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分享统计失败'
    });
  }
};

module.exports = {
  createShare,
  getMyShares,
  deleteShare,
  accessShare,
  downloadShare,
  getShareStats,
  toggleShare,
  updateShare
};
