const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/mysql');
const { emitUploadProgress, emitUploadComplete, emitUploadFailed } = require('../config/socket');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${uuidv4()}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 100 * 1024 * 1024 } });

const getUploads = async (req, res) => {
  const { userId } = req.user;
  try {
    const pool = await getPool();
    const [uploads] = await pool.execute('SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ success: true, data: uploads });
  } catch (error) {
    console.error('获取上传记录错误:', error);
    res.status(500).json({ success: false, message: '获取上传记录失败' });
  }
};

const getUploadById = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  try {
    const pool = await getPool();
    const [uploads] = await pool.execute('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [id, userId]);
    if (uploads.length === 0) {
      return res.status(404).json({ success: false, message: '上传记录不存在' });
    }
    res.json({ success: true, data: uploads[0] });
  } catch (error) {
    console.error('获取上传记录错误:', error);
    res.status(500).json({ success: false, message: '获取上传记录失败' });
  }
};

const uploadFile = (req, res) => {
  const { userId } = req.user;
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      return res.status(500).json({ success: false, message: '文件上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }
    try {
      const pool = await getPool();
      const [result] = await pool.execute(
        'INSERT INTO uploads (user_id, filename, original_filename, file_path, status, progress, uploaded_bytes, total_bytes, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, req.file.filename, req.file.originalname, req.file.path, 'completed', 100.0, req.file.size, req.file.size, new Date()]
      );
      const [uploads] = await pool.execute('SELECT * FROM uploads WHERE id = ?', [result.insertId]);
      const uploadedFile = uploads[0];
      
      emitUploadComplete(userId, result.insertId, uploadedFile.original_filename);
      
      res.status(201).json({ success: true, message: '文件上传成功', data: uploadedFile });
    } catch (error) {
      console.error('创建上传记录错误:', error);
      res.status(500).json({ success: false, message: '文件上传失败' });
    }
  });
};

const updateUpload = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { status, progress, uploaded_bytes, total_bytes, speed, completed_at } = req.body;
  try {
    const pool = await getPool();
    const [uploads] = await pool.execute('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [id, userId]);
    if (uploads.length === 0) {
      return res.status(404).json({ success: false, message: '上传记录不存在或无权访问' });
    }
    const updates = [];
    const values = [];
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (progress !== undefined) { updates.push('progress = ?'); values.push(progress); }
    if (uploaded_bytes !== undefined) { updates.push('uploaded_bytes = ?'); values.push(uploaded_bytes); }
    if (total_bytes !== undefined) { updates.push('total_bytes = ?'); values.push(total_bytes); }
    if (speed !== undefined) { updates.push('speed = ?'); values.push(speed); }
    if (completed_at !== undefined) { updates.push('completed_at = ?'); values.push(completed_at); }
    if (updates.length > 0) {
      values.push(id, userId);
      await pool.execute(`UPDATE uploads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }
    const [updatedUploads] = await pool.execute('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [id, userId]);
    const updatedUpload = updatedUploads[0];

    if (status !== undefined) {
      if (status === 'completed') {
        emitUploadComplete(userId, id, updatedUpload.original_filename);
      } else if (status === 'failed') {
        emitUploadFailed(userId, id, '上传失败');
      }
    }

    if (progress !== undefined || status !== undefined) {
      emitUploadProgress(userId, id, progress || updatedUpload.progress, status || updatedUpload.status);
    }

    res.json({ success: true, message: '上传任务更新成功', data: updatedUpload });
  } catch (error) {
    console.error('更新上传记录错误:', error);
    res.status(500).json({ success: false, message: '更新上传任务失败' });
  }
};

const deleteUpload = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  try {
    const pool = await getPool();
    const [uploads] = await pool.execute('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [id, userId]);
    if (uploads.length === 0) {
      return res.status(404).json({ success: false, message: '上传记录不存在或无权访问' });
    }
    const upload = uploads[0];
    if (fs.existsSync(upload.file_path)) {
      fs.unlinkSync(upload.file_path);
    }
    await pool.execute('DELETE FROM uploads WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true, message: '上传记录删除成功' });
  } catch (error) {
    console.error('删除上传记录错误:', error);
    res.status(500).json({ success: false, message: '删除上传记录失败' });
  }
};

const clearCompletedUploads = async (req, res) => {
  const { userId } = req.user;
  try {
    const pool = await getPool();
    const [uploads] = await pool.execute("SELECT * FROM uploads WHERE user_id = ? AND status IN ('completed', 'cancelled')", [userId]);
    for (const upload of uploads) {
      if (fs.existsSync(upload.file_path)) {
        fs.unlinkSync(upload.file_path);
      }
    }
    const [result] = await pool.execute("DELETE FROM uploads WHERE user_id = ? AND status IN ('completed', 'cancelled')", [userId]);
    res.json({ success: true, message: `成功删除 ${result.affectedRows} 条已完成记录` });
  } catch (error) {
    console.error('清空已完成记录错误:', error);
    res.status(500).json({ success: false, message: '清空已完成记录失败' });
  }
};

module.exports = { getUploads, getUploadById, uploadFile, updateUpload, deleteUpload, clearCompletedUploads };
