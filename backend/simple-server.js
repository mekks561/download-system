const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// 简单的内存数据库，或者使用低优先级的文件存储
const db = {
  users: [
    { id: 1, username: 'admin', email: 'admin@example.com', password: 'admin123' } // 测试密码: admin123
  ],
  downloads: [],
  uploads: []
};

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

  const existingUser = db.users.find(u => u.username === username || u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: '用户名或邮箱已存在'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: db.users.length + 1,
    username,
    email,
    password: hashedPassword
  };
  db.users.push(newUser);

  const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '邮箱和密码都是必填项'
    });
  }

  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '邮箱或密码错误'
    });
  }

  const isMatch = user.password.startsWith('$2a') ? 
    await bcrypt.compare(password, user.password) : 
    password === user.password; // 支持非加密密码以便测试

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: '邮箱或密码错误'
    });
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: { id: user.id, username: user.username, email: user.email }
    }
  });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }
  });
});

// 下载相关路由
app.get('/api/downloads', authenticateToken, (req, res) => {
  const userDownloads = db.downloads.filter(d => d.userId === req.user.userId);
  res.json({
    success: true,
    data: userDownloads,
    total: userDownloads.length
  });
});

app.post('/api/downloads', authenticateToken, (req, res) => {
  const { url, filename } = req.body;
  const newDownload = {
    id: Date.now().toString(),
    userId: req.user.userId,
    url,
    filename: filename || url.split('/').pop() || 'unknown',
    status: 'pending',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    resumePosition: 0,
    createdAt: Date.now()
  };
  db.downloads.push(newDownload);
  res.json({
    success: true,
    data: newDownload
  });
});

app.put('/api/downloads/:id', authenticateToken, (req, res) => {
  const download = db.downloads.find(d => d.id === req.params.id && d.userId === req.user.userId);
  if (!download) {
    return res.status(404).json({
      success: false,
      message: '下载任务不存在'
    });
  }
  Object.assign(download, req.body);
  res.json({
    success: true,
    data: download
  });
});

app.delete('/api/downloads/:id', authenticateToken, (req, res) => {
  const index = db.downloads.findIndex(d => d.id === req.params.id && d.userId === req.user.userId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: '下载任务不存在'
    });
  }
  db.downloads.splice(index, 1);
  res.json({ success: true });
});

// 上传相关路由
app.get('/api/uploads', authenticateToken, (req, res) => {
  const userUploads = db.uploads.filter(u => u.userId === req.user.userId);
  res.json({
    success: true,
    data: userUploads,
    total: userUploads.length
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常运行',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: db.users.length,
      totalDownloads: db.downloads.length,
      totalUploads: db.uploads.length
    }
  });
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

app.listen(PORT, () => {
  console.log('\n🚀 后端API服务已启动！');
  console.log(`🌐 API地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📈 指标监控: http://localhost:${PORT}/api/metrics`);
  console.log('\n测试用户:');
  console.log('  邮箱: admin@example.com');
  console.log('  密码: admin123\n');
});
