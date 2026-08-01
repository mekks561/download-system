const fs = require('fs');
const path = require('path');
const { getPool } = require('../config/mysql');
const { logger } = require('../utils/logger');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

async function renameFile(req, res) {
  const { userId } = req.user;
  const { id, newName } = req.body;

  if (!id || !newName) {
    return res.status(400).json({
      success: false,
      message: '文件ID和新名称都是必填项'
    });
  }

  try {
    const pool = await getPool();
    
    const [files] = await pool.execute(
      'SELECT id, filename, original_filename, file_path FROM uploads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const file = files[0];
    const oldPath = file.file_path;
    
    const ext = path.extname(file.original_filename);
    const newFilename = path.basename(newName, ext) + ext;
    const newPath = path.join(path.dirname(file.file_path), newFilename);

    if (fs.existsSync(newPath)) {
      return res.status(400).json({
        success: false,
        message: '文件已存在'
      });
    }

    await fs.promises.rename(oldPath, newPath);

    await pool.execute(
      'UPDATE uploads SET original_filename = ?, file_path = ?, updated_at = NOW() WHERE id = ?',
      [newName, newPath, id]
    );

    logger.info(`文件重命名成功: ${file.original_filename} -> ${newName}`, { userId, fileId: id });

    res.json({
      success: true,
      message: '文件重命名成功',
      data: {
        id: file.id,
        original_filename: newName,
        file_path: newPath
      }
    });
  } catch (error) {
    logger.error('文件重命名失败', { userId, fileId: id, error: error.message });
    res.status(500).json({
      success: false,
      message: '文件重命名失败'
    });
  }
}

async function deleteFile(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: '文件ID是必填项'
    });
  }

  try {
    const pool = await getPool();
    
    const [files] = await pool.execute(
      'SELECT id, filename, file_path FROM uploads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const file = files[0];
    
    if (fs.existsSync(file.file_path)) {
      await fs.promises.unlink(file.file_path);
    }

    await pool.execute('DELETE FROM uploads WHERE id = ?', [id]);
    await pool.execute('DELETE FROM file_shares WHERE upload_id = ?', [id]);

    logger.info(`文件删除成功`, { userId, fileId: id });

    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    logger.error('文件删除失败', { userId, fileId: id, error: error.message });
    res.status(500).json({
      success: false,
      message: '文件删除失败'
    });
  }
}

async function batchDeleteFiles(req, res) {
  const { userId } = req.user;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请选择要删除的文件'
    });
  }

  try {
    const pool = await getPool();
    
    const placeholders = ids.map(() => '?').join(',');
    const [files] = await pool.execute(
      `SELECT id, filename, file_path FROM uploads WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );

    for (const file of files) {
      if (fs.existsSync(file.file_path)) {
        await fs.promises.unlink(file.file_path).catch(() => {});
      }
    }

    await pool.execute(`DELETE FROM uploads WHERE id IN (${placeholders}) AND user_id = ?`, [...ids, userId]);
    await pool.execute(`DELETE FROM file_shares WHERE upload_id IN (${placeholders})`, ids);

    logger.info(`批量删除文件成功`, { userId, fileIds: ids });

    res.json({
      success: true,
      message: `成功删除 ${files.length} 个文件`
    });
  } catch (error) {
    logger.error('批量删除文件失败', { userId, fileIds: ids, error: error.message });
    res.status(500).json({
      success: false,
      message: '批量删除文件失败'
    });
  }
}

async function getUserFiles(req, res) {
  const { userId } = req.user;
  const { page = 1, pageSize = 20, type, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  try {
    const pool = await getPool();
    
    let query = `
      SELECT 
        id, 
        original_filename as filename, 
        file_path as path, 
        total_bytes as size, 
        status,
        created_at,
        completed_at,
        user_id as parent_id
      FROM uploads 
      WHERE user_id = ?
    `;
    
    const params = [userId];

    if (type) {
      query += ' AND status = ?';
      params.push(type);
    }

    const validSortFields = ['created_at', 'completed_at', 'size', 'original_filename'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${order}`;

    const offset = (page - 1) * pageSize;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [files] = await pool.execute(query, params);

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM uploads WHERE user_id = ?',
      [userId]
    );
    const total = countResult[0].total;

    res.json({
      success: true,
      data: files,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    logger.error('获取用户文件失败', { userId, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取文件失败'
    });
  }
}

async function getFileInfo(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    
    const [files] = await pool.execute(
      `SELECT 
        id, 
        original_filename as filename, 
        file_path as path, 
        total_bytes as size, 
        status,
        created_at,
        completed_at
      FROM uploads 
      WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const file = files[0];
    
    const stats = fs.existsSync(file.path) ? fs.statSync(file.path) : null;

    res.json({
      success: true,
      data: {
        ...file,
        exists: !!stats,
        modified_at: stats?.mtime?.toISOString()
      }
    });
  } catch (error) {
    logger.error('获取文件信息失败', { userId, fileId: id, error: error.message });
    res.status(500).json({
      success: false,
      message: '获取文件信息失败'
    });
  }
}

async function createFolder(req, res) {
  const { userId } = req.user;
  const { name, parentId = null } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: '文件夹名称是必填项'
    });
  }

  try {
    const folderPath = path.join(UPLOAD_PATH, String(userId), name);
    
    if (fs.existsSync(folderPath)) {
      return res.status(400).json({
        success: false,
        message: '文件夹已存在'
      });
    }

    await fs.promises.mkdir(folderPath, { recursive: true });

    logger.info(`创建文件夹成功`, { userId, folderPath });

    res.json({
      success: true,
      message: '文件夹创建成功',
      data: {
        name,
        path: folderPath,
        parent_id: parentId,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('创建文件夹失败', { userId, folderName: name, error: error.message });
    res.status(500).json({
      success: false,
      message: '创建文件夹失败'
    });
  }
}

async function moveFile(req, res) {
  const { userId } = req.user;
  const { id, targetFolderId } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: '文件ID是必填项'
    });
  }

  try {
    const pool = await getPool();
    
    const [files] = await pool.execute(
      'SELECT id, filename, original_filename, file_path FROM uploads WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const file = files[0];
    const targetFolderPath = targetFolderId 
      ? path.join(UPLOAD_PATH, String(userId), String(targetFolderId))
      : path.join(UPLOAD_PATH, String(userId));
    
    if (!fs.existsSync(targetFolderPath)) {
      return res.status(404).json({
        success: false,
        message: '目标文件夹不存在'
      });
    }

    const newPath = path.join(targetFolderPath, path.basename(file.file_path));
    
    if (fs.existsSync(newPath)) {
      return res.status(400).json({
        success: false,
        message: '目标位置已存在同名文件'
      });
    }

    await fs.promises.rename(file.file_path, newPath);

    await pool.execute(
      'UPDATE uploads SET file_path = ?, updated_at = NOW() WHERE id = ?',
      [newPath, id]
    );

    logger.info(`文件移动成功`, { userId, fileId: id, newPath });

    res.json({
      success: true,
      message: '文件移动成功',
      data: {
        id: file.id,
        file_path: newPath
      }
    });
  } catch (error) {
    logger.error('文件移动失败', { userId, fileId: id, error: error.message });
    res.status(500).json({
      success: false,
      message: '文件移动失败'
    });
  }
}

async function previewFile(req, res) {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ success: false, message: '缺少文件路径' });
    }
    
    const safePath = path.resolve(filePath);
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    
    const ext = path.extname(filePath).toLowerCase();
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.html', '.css'];
    const pdfExtension = '.pdf';
    
    if (imageExtensions.includes(ext)) {
      const image = fs.readFileSync(safePath);
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.send(image);
    } else if (textExtensions.includes(ext)) {
      const text = fs.readFileSync(safePath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(text);
    } else if (ext === pdfExtension) {
      const pdf = fs.readFileSync(safePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdf);
    } else {
      res.status(400).json({ success: false, message: '不支持的文件类型' });
    }
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ success: false, message: '预览文件失败' });
  }
}

async function downloadFile(req, res) {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ success: false, message: '缺少文件路径' });
    }
    
    const safePath = path.resolve(filePath);
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    
    const fileName = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ success: false, message: '下载文件失败' });
  }
}

async function getDownloadedFiles(req, res) {
  try {
    const pool = await getPool();
    const userId = req.user.id;
    
    const [downloads] = await pool.query(
      'SELECT id, filename, file_path, file_size, status FROM downloads WHERE user_id = ? AND status = ?',
      [userId, 'completed']
    );
    
    res.json({ success: true, data: downloads });
  } catch (error) {
    console.error('Get downloaded files error:', error);
    res.status(500).json({ success: false, message: '获取文件列表失败' });
  }
}

module.exports = {
  renameFile,
  deleteFile,
  batchDeleteFiles,
  getUserFiles,
  getFileInfo,
  createFolder,
  moveFile,
  previewFile,
  downloadFile,
  getDownloadedFiles
};
