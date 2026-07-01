const mysql = require('mysql2/promise');
require('dotenv').config();

async function initGmTables() {
  console.log('🚀 初始化GM后台数据库表...\n');

  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'download_manager'
    });

    console.log('✅ 连接到MySQL数据库成功！');

    console.log('\n📋 创建GM公告表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS gm_announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_is_pinned (is_pinned)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ GM公告表创建成功！');

    console.log('\n📋 创建GM系统日志表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS gm_system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gm_user_id BIGINT,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id BIGINT,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status INT DEFAULT 200,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gm_user_id (gm_user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ GM系统日志表创建成功！');

    console.log('\n🎉 GM后台数据库表初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initGmTables();
