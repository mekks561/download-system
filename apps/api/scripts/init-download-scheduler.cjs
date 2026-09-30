const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDownloadScheduler() {
  console.log('🚀 初始化下载计划调度数据库...\n');

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

    console.log('\n📋 创建下载计划表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS download_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        url VARCHAR(2048) NOT NULL,
        filename VARCHAR(255),
        schedule_type ENUM('once', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'once',
        schedule_time TIME NOT NULL,
        schedule_day VARCHAR(10),
        schedule_date VARCHAR(10),
        priority INT NOT NULL DEFAULT 5,
        status ENUM('active', 'paused', 'completed', 'failed') NOT NULL DEFAULT 'active',
        last_run_at DATETIME,
        next_run_at DATETIME,
        total_runs INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_next_run_at (next_run_at),
        INDEX idx_schedule_type (schedule_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 下载计划表创建成功！');

    console.log('\n📋 创建下载计划历史记录表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS download_schedule_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        user_id BIGINT NOT NULL,
        url VARCHAR(2048) NOT NULL,
        filename VARCHAR(255),
        status ENUM('success', 'failed', 'skipped') NOT NULL,
        error_message TEXT,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_schedule_id (schedule_id),
        INDEX idx_user_id (user_id),
        INDEX idx_executed_at (executed_at),
        FOREIGN KEY (schedule_id) REFERENCES download_schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 下载计划历史记录表创建成功！');

    console.log('\n🎉 下载计划调度数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDownloadScheduler();
