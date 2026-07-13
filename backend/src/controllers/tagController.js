const { getPool } = require('../config/mysql');

const getTags = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    const [tags] = await pool.execute(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY usage_count DESC, created_at DESC',
      [userId]
    );

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('获取标签错误:', error);
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
};

const getTagById = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    const [tags] = await pool.execute(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (tags.length === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    res.json({ success: true, data: tags[0] });
  } catch (error) {
    console.error('获取标签错误:', error);
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
};

const createTag = async (req, res) => {
  const { userId } = req.user;
  const { name, color, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '标签名称不能为空' });
  }

  try {
    const pool = await getPool();
    
    const [existing] = await pool.execute(
      'SELECT id FROM tags WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '标签名称已存在' });
    }

    const [result] = await pool.execute(
      'INSERT INTO tags (user_id, name, color, description) VALUES (?, ?, ?, ?)',
      [userId, name, color || '#ec4899', description || null]
    );

    const [tags] = await pool.execute('SELECT * FROM tags WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: tags[0] });
  } catch (error) {
    console.error('创建标签错误:', error);
    res.status(500).json({ success: false, message: '创建标签失败' });
  }
};

const updateTag = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;
  const { name, color, description } = req.body;

  try {
    const pool = await getPool();
    
    const [existing] = await pool.execute(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    if (name && name !== existing[0].name) {
      const [duplicate] = await pool.execute(
        'SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?',
        [userId, name, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ success: false, message: '标签名称已存在' });
      }
    }

    const [result] = await pool.execute(
      'UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color), description = COALESCE(?, description) WHERE id = ? AND user_id = ?',
      [name, color, description, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    const [tags] = await pool.execute('SELECT * FROM tags WHERE id = ?', [id]);

    res.json({ success: true, data: tags[0] });
  } catch (error) {
    console.error('更新标签错误:', error);
    res.status(500).json({ success: false, message: '更新标签失败' });
  }
};

const deleteTag = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const pool = await getPool();
    
    const [existing] = await pool.execute(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    await pool.execute('DELETE FROM file_tags WHERE tag_id = ?', [id]);
    await pool.execute('DELETE FROM tags WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ success: true, message: '标签删除成功' });
  } catch (error) {
    console.error('删除标签错误:', error);
    res.status(500).json({ success: false, message: '删除标签失败' });
  }
};

const addTagsToFile = async (req, res) => {
  const { userId } = req.user;
  const { fileId, fileType } = req.params;
  const { tagIds } = req.body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return res.status(400).json({ success: false, message: '标签ID列表不能为空' });
  }

  try {
    const pool = await getPool();
    
    const [tags] = await pool.execute(
      'SELECT id FROM tags WHERE id IN (' + tagIds.map(() => '?').join(',') + ') AND user_id = ?',
      [...tagIds, userId]
    );
    
    if (tags.length !== tagIds.length) {
      return res.status(400).json({ success: false, message: '部分标签不存在' });
    }

    const insertPromises = tagIds.map(tagId => {
      return pool.execute(
        'INSERT IGNORE INTO file_tags (user_id, file_id, file_type, tag_id) VALUES (?, ?, ?, ?)',
        [userId, fileId, fileType, tagId]
      );
    });

    await Promise.all(insertPromises);

    const updatePromises = tagIds.map(tagId => {
      return pool.execute(
        'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
        [tagId]
      );
    });

    await Promise.all(updatePromises);

    const [fileTags] = await pool.execute(
      'SELECT t.* FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = ? AND ft.file_type = ?',
      [fileId, fileType]
    );

    res.json({ success: true, data: fileTags });
  } catch (error) {
    console.error('添加标签到文件错误:', error);
    res.status(500).json({ success: false, message: '添加标签失败' });
  }
};

const removeTagsFromFile = async (req, res) => {
  const { userId } = req.user;
  const { fileId, fileType } = req.params;
  const { tagIds } = req.body;

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return res.status(400).json({ success: false, message: '标签ID列表不能为空' });
  }

  try {
    const pool = await getPool();

    await pool.execute(
      'DELETE FROM file_tags WHERE file_id = ? AND file_type = ? AND tag_id IN (' + tagIds.map(() => '?').join(',') + ')',
      [fileId, fileType, ...tagIds]
    );

    const updatePromises = tagIds.map(tagId => {
      return pool.execute(
        'UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = ?',
        [tagId]
      );
    });

    await Promise.all(updatePromises);

    const [fileTags] = await pool.execute(
      'SELECT t.* FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = ? AND ft.file_type = ?',
      [fileId, fileType]
    );

    res.json({ success: true, data: fileTags });
  } catch (error) {
    console.error('移除文件标签错误:', error);
    res.status(500).json({ success: false, message: '移除标签失败' });
  }
};

const getFileTags = async (req, res) => {
  const { userId } = req.user;
  const { fileId, fileType } = req.params;

  try {
    const pool = await getPool();
    const [tags] = await pool.execute(
      'SELECT t.* FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = ? AND ft.file_type = ? AND ft.user_id = ?',
      [fileId, fileType, userId]
    );

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('获取文件标签错误:', error);
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
};

const searchByTag = async (req, res) => {
  const { userId } = req.user;
  const { tagId, fileType, limit = 50, offset = 0 } = req.query;

  try {
    const pool = await getPool();
    
    const [tag] = await pool.execute(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [tagId, userId]
    );
    
    if (tag.length === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    let query = `
      SELECT ft.file_id, ft.file_type, 
             COALESCE(d.filename, u.original_filename, f.filename) as filename,
             COALESCE(d.url, u.file_path, f.file_path) as path,
             COALESCE(d.status, u.status) as status,
             COALESCE(d.created_at, u.created_at, f.created_at) as created_at
      FROM file_tags ft
      LEFT JOIN downloads d ON ft.file_id = d.id AND ft.file_type = 'download'
      LEFT JOIN uploads u ON ft.file_id = u.id AND ft.file_type = 'upload'
      LEFT JOIN files f ON ft.file_id = f.id AND ft.file_type = 'file'
      WHERE ft.tag_id = ? AND ft.user_id = ?
    `;
    
    const params = [tagId, userId];

    if (fileType) {
      query += ' AND ft.file_type = ?';
      params.push(fileType);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [results] = await pool.execute(query, params);

    const countQuery = query.replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, -2);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM (' + countQuery + ') AS t', [...countParams]);

    res.json({ 
      success: true, 
      data: results,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('按标签搜索错误:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
};

module.exports = {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  addTagsToFile,
  removeTagsFromFile,
  getFileTags,
  searchByTag
};