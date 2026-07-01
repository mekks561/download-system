const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接池配置
let pool = null;

async function initializeDatabase() {
  try {
    // 先创建数据库连接而不指定数据库，以便创建数据库
    const tempConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });

    await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'download_manager'}\` 
      DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConn.end();

    // 创建带数据库的连接池
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'download_manager',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });

    // 创建表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS downloads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        url TEXT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        downloaded_bytes BIGINT NOT NULL DEFAULT 0,
        total_bytes BIGINT NOT NULL DEFAULT 0,
        speed BIGINT NOT NULL DEFAULT 0,
        resume_position BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        uploaded_bytes BIGINT NOT NULL DEFAULT 0,
        total_bytes BIGINT NOT NULL DEFAULT 0,
        speed BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 检查是否已有默认用户，如果没有则创建
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.execute(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        ['admin', 'admin@example.com', hashedPassword]
      );
      console.log('✅ 默认用户创建成功: admin@example.com');
    }

    console.log('✅ 数据库表创建成功！');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    return false;
  }
}

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '无效的认证令牌'
      });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名、邮箱和密码都是必填项'
    });
  }

  try {
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: { id: String(userId), username, email }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '邮箱和密码都是必填项'
    });
  }

  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: { id: String(user.id), username: user.username, email: user.email }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...users[0],
          id: String(users[0].id)
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 下载相关路由
app.get('/api/downloads', authenticateToken, async (req, res) => {
  try {
    const [downloads] = await pool.execute(
      'SELECT * FROM downloads WHERE user_id = ?',
      [req.user.userId]
    );

    // 转换字段名为前端期望的命名
    const formattedDownloads = downloads.map(d => ({
      id: String(d.id),
      userId: String(d.user_id),
      url: d.url,
      filename: d.filename,
      status: d.status,
      progress: parseFloat(d.progress),
      downloadedBytes: d.downloaded_bytes,
      totalBytes: d.total_bytes,
      speed: d.speed,
      resumePosition: d.resume_position,
      createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      completedAt: d.completed_at ? new Date(d.completed_at).getTime() : null
    }));

    res.json({
      success: true,
      data: formattedDownloads,
      total: formattedDownloads.length
    });
  } catch (error) {
    console.error('获取下载列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取下载列表失败'
    });
  }
});

app.post('/api/downloads', authenticateToken, async (req, res) => {
  const { url, filename } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO downloads (user_id, url, filename, status, progress, downloaded_bytes, total_bytes, speed, resume_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, url, filename || url.split('/').pop() || 'unknown', 'pending', 0, 0, 0, 0, 0]
    );

    const [downloads] = await pool.execute('SELECT * FROM downloads WHERE id = ?', [result.insertId]);
    const download = downloads[0];

    res.json({
      success: true,
      data: {
        id: String(download.id),
        userId: String(download.user_id),
        url: download.url,
        filename: download.filename,
        status: download.status,
        progress: parseFloat(download.progress),
        downloadedBytes: download.downloaded_bytes,
        totalBytes: download.total_bytes,
        speed: download.speed,
        resumePosition: download.resume_position,
        createdAt: download.created_at ? new Date(download.created_at).getTime() : Date.now()
      }
    });
  } catch (error) {
    console.error('创建下载任务错误:', error);
    res.status(500).json({
      success: false,
      message: '创建下载任务失败'
    });
  }
});

app.put('/api/downloads/:id', authenticateToken, async (req, res) => {
  try {
    const [downloads] = await pool.execute(
      'SELECT * FROM downloads WHERE id = ? AND user_id = ?',
      [parseInt(req.params.id), req.user.userId]
    );

    if (downloads.length === 0) {
      return res.status(404).json({
        success: false,
        message: '下载任务不存在'
      });
    }

    const updates = [];
    const values = [];

    if (req.body.status) { updates.push('status = ?'); values.push(req.body.status); }
    if (req.body.progress !== undefined) { updates.push('progress = ?'); values.push(req.body.progress); }
    if (req.body.downloadedBytes !== undefined) { updates.push('downloaded_bytes = ?'); values.push(req.body.downloadedBytes); }
    if (req.body.totalBytes !== undefined) { updates.push('total_bytes = ?'); values.push(req.body.totalBytes); }
    if (req.body.speed !== undefined) { updates.push('speed = ?'); values.push(req.body.speed); }
    if (req.body.resumePosition !== undefined) { updates.push('resume_position = ?'); values.push(req.body.resumePosition); }
    if (req.body.status === 'completed') { updates.push('completed_at = CURRENT_TIMESTAMP'); }

    if (updates.length > 0) {
      values.push(parseInt(req.params.id));
      values.push(req.user.userId);

      await pool.execute(
        `UPDATE downloads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );
    }

    const [updatedDownloads] = await pool.execute(
      'SELECT * FROM downloads WHERE id = ?',
      [parseInt(req.params.id)]
    );
    const download = updatedDownloads[0];

    res.json({
      success: true,
      data: {
        id: String(download.id),
        userId: String(download.user_id),
        url: download.url,
        filename: download.filename,
        status: download.status,
        progress: parseFloat(download.progress),
        downloadedBytes: download.downloaded_bytes,
        totalBytes: download.total_bytes,
        speed: download.speed,
        resumePosition: download.resume_position,
        createdAt: download.created_at ? new Date(download.created_at).getTime() : Date.now(),
        completedAt: download.completed_at ? new Date(download.completed_at).getTime() : null
      }
    });
  } catch (error) {
    console.error('更新下载任务错误:', error);
    res.status(500).json({
      success: false,
      message: '更新下载任务失败'
    });
  }
});

app.delete('/api/downloads/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM downloads WHERE id = ? AND user_id = ?',
      [parseInt(req.params.id), req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('删除下载任务错误:', error);
    res.status(500).json({
      success: false,
      message: '删除下载任务失败'
    });
  }
});

app.delete('/api/downloads/clear', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM downloads WHERE user_id = ? AND status = ?',
      [req.user.userId, 'completed']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('清除已完成任务错误:', error);
    res.status(500).json({
      success: false,
      message: '清除已完成任务失败'
    });
  }
});

// 上传相关路由
app.get('/api/uploads', authenticateToken, async (req, res) => {
  try {
    const [uploads] = await pool.execute(
      'SELECT * FROM uploads WHERE user_id = ?',
      [req.user.userId]
    );

    const formattedUploads = uploads.map(u => ({
      id: u.id.toString(),
      userId: u.user_id,
      filename: u.filename,
      originalFilename: u.original_filename,
      filePath: u.file_path,
      status: u.status,
      progress: parseFloat(u.progress),
      uploadedBytes: u.uploaded_bytes,
      totalBytes: u.total_bytes,
      speed: u.speed,
      createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
      completedAt: u.completed_at ? new Date(u.completed_at).getTime() : null
    }));

    res.json({
      success: true,
      data: formattedUploads,
      total: formattedUploads.length
    });
  } catch (error) {
    console.error('获取上传列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取上传列表失败'
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常运行',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', async (req, res) => {
  try {
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [downloadCount] = await pool.execute('SELECT COUNT(*) as count FROM downloads');
    const [uploadCount] = await pool.execute('SELECT COUNT(*) as count FROM uploads');

    res.json({
      success: true,
      data: {
        totalUsers: userCount[0].count,
        totalDownloads: downloadCount[0].count,
        totalUploads: uploadCount[0].count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取指标失败'
    });
  }
});

// 错误处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '路由不存在'
  });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
async function startServer() {
  console.log('🚀 开始初始化MySQL数据库...\n');
  const dbInitialized = await initializeDatabase();

  if (dbInitialized) {
    app.listen(PORT, () => {
      console.log('\n🚀 后端API服务已启动！');
      console.log(`🌐 API地址: http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
      console.log(`📈 指标监控: http://localhost:${PORT}/api/metrics`);
      console.log(`📁 数据库: ${process.env.MYSQL_DATABASE || 'download_manager'}`);
      console.log('\n测试用户:');
      console.log('  邮箱: admin@example.com');
      console.log('  密码: admin123\n');
    });
  } else {
    console.error('❌ 数据库连接失败，请检查MySQL服务是否运行以及连接配置是否正确。');
    process.exit(1);
  }
}

startServer();
