const mysql = require('mysql2/promise');
require('dotenv').config();

async function initFileShare() {
  console.log('🚀 初始化文件分享数据库...\n');

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

    console.log('\n📋 创建文件分享表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS file_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        upload_id BIGINT NOT NULL,
        share_token VARCHAR(64) NOT NULL UNIQUE,
        share_url VARCHAR(512),
        password VARCHAR(255),
        expires_at DATETIME,
        max_downloads INT DEFAULT 1,
        download_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_upload_id (upload_id),
        INDEX idx_share_token (share_token),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 文件分享表创建成功！');

    console.log('\n📋 创建文件分享访问记录表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS file_share_access_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        share_id INT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        access_type ENUM('view', 'download') NOT NULL,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_share_id (share_id),
        INDEX idx_accessed_at (accessed_at),
        INDEX idx_access_type (access_type),
        FOREIGN KEY (share_id) REFERENCES file_shares(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 文件分享访问记录表创建成功！');

    console.log('\n🎉 文件分享数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initFileShare();
