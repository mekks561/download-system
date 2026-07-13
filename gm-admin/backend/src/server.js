const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const gmRoutes = require('./routes/gmRoutes');
const { testConnection } = require('./config/mysql');

const app = express();
const PORT = parseInt(process.env.GM_PORT) || 5002;

app.use(cors({
  origin: ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:5002', 'http://127.0.0.1:5002'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供前端静态文件
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.use('/gm-api', gmRoutes);

app.get('/gm-api/health', (req, res) => {
  res.json({ success: true, message: 'GM后台服务运行正常' });
});

// 前端路由 fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.use((err, req, res, next) => {
  console.error('GM后台错误:', err);
  res.status(500).json({
    success: false,
    message: 'GM后台服务器内部错误'
  });
});

async function startServer() {
  console.log('🚀 启动GM后台管理系统...\n');
  
  try {
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n✅ GM后台服务启动成功！');
      console.log(`🌐 GM后台API地址: http://localhost:${PORT}`);
      console.log(`🔒 GM管理面板: http://localhost:${PORT}`);
      console.log(`\n⚠️  注意: GM后台是独立系统，与主应用完全分离！`);
      
      app.listen(PORT, () => {
        console.log(`\n✅ GM后台服务已在 http://localhost:${PORT} 运行！`);
      });
    } else {
      console.error('\n❌ 无法连接数据库，GM后台启动失败。');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ GM后台启动失败:', error);
    process.exit(1);
  }
}

startServer();
