const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let initializationPromise = null;

async function initializeDb() {
  if (pool) {
    return pool;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const tempConnection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || ''
      });

      await tempConnection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'download_manager'}\` 
         DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await tempConnection.end();
    } catch (error) {
      console.error('创建数据库失败:', error.message);
      throw error;
    }

    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'download_manager',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      namedPlaceholders: true,
      decimalNumbers: true
    });

    return pool;
  })();

  return initializationPromise;
}

async function initializeDatabase() {
  try {
    const database = await initializeDb();
    console.log('✅ 连接到MySQL服务器成功！');
    console.log(`📁 数据库: ${process.env.MYSQL_DATABASE || 'download_manager'}`);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
        email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱地址',
        password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
        phone VARCHAR(20) NULL COMMENT '手机号码',
        two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用两步验证',
        two_factor_secret VARCHAR(255) NULL COMMENT '两步验证密钥',
        two_factor_expires_at DATETIME NULL COMMENT '验证码过期时间',
        two_factor_phone VARCHAR(20) NULL COMMENT '绑定的验证手机号',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_users_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);
    console.log('✅ users表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS downloads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        url TEXT NOT NULL COMMENT '下载URL',
        filename VARCHAR(255) NOT NULL COMMENT '文件名',
        status ENUM('pending', 'downloading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '下载状态',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '下载进度 0-100',
        downloaded_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '已下载字节数',
        total_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '总字节数',
        speed BIGINT NOT NULL DEFAULT 0 COMMENT '下载速度 bytes/s',
        resume_position BIGINT NOT NULL DEFAULT 0 COMMENT '断点续传位置',
        error_message TEXT NULL COMMENT '错误信息',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        completed_at DATETIME NULL COMMENT '完成时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_downloads_user_id (user_id),
        INDEX idx_downloads_status (status),
        INDEX idx_downloads_created_at (created_at),
        INDEX idx_downloads_user_status (user_id, status),
        INDEX idx_downloads_user_created (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载记录表'
    `);
    console.log('✅ downloads表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        filename VARCHAR(255) NOT NULL COMMENT '服务器文件名（UUID）',
        original_filename VARCHAR(255) NOT NULL COMMENT '原始文件名',
        file_path TEXT NOT NULL COMMENT '文件完整路径',
        status ENUM('pending', 'uploading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '上传状态',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '上传进度 0-100',
        uploaded_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '已上传字节数',
        total_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '总字节数',
        speed BIGINT NOT NULL DEFAULT 0 COMMENT '上传速度 bytes/s',
        error_message TEXT NULL COMMENT '错误信息',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        completed_at DATETIME NULL COMMENT '完成时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_uploads_user_id (user_id),
        INDEX idx_uploads_status (status),
        INDEX idx_uploads_created_at (created_at),
        INDEX idx_uploads_user_status (user_id, status),
        INDEX idx_uploads_user_created (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传记录表'
    `);
    console.log('✅ uploads表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS download_schedules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        url TEXT NOT NULL COMMENT '下载URL',
        filename VARCHAR(255) NULL COMMENT '文件名',
        schedule_type ENUM('once', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'once' COMMENT '计划类型',
        schedule_time TIME NOT NULL COMMENT '执行时间',
        schedule_day VARCHAR(20) NULL COMMENT '星期（weekly类型）',
        schedule_date DATE NULL COMMENT '日期（monthly类型）',
        priority INT NOT NULL DEFAULT 5 COMMENT '优先级 1-10',
        status ENUM('active', 'paused', 'completed', 'failed') NOT NULL DEFAULT 'active' COMMENT '计划状态',
        last_run_at DATETIME NULL COMMENT '上次执行时间',
        next_run_at DATETIME NOT NULL COMMENT '下次执行时间',
        total_runs INT NOT NULL DEFAULT 0 COMMENT '已执行次数',
        error_message TEXT NULL COMMENT '错误信息',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_download_schedules_user_id (user_id),
        INDEX idx_download_schedules_status (status),
        INDEX idx_download_schedules_next_run (next_run_at),
        INDEX idx_download_schedules_user_status (user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载计划表'
    `);
    console.log('✅ download_schedules表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS download_schedule_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        schedule_id BIGINT NOT NULL COMMENT '计划ID',
        status ENUM('success', 'failed') NOT NULL COMMENT '执行状态',
        error_message TEXT NULL COMMENT '错误信息',
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (schedule_id) REFERENCES download_schedules(id) ON DELETE CASCADE,
        INDEX idx_download_schedule_logs_user_id (user_id),
        INDEX idx_download_schedule_logs_schedule_id (schedule_id),
        INDEX idx_download_schedule_logs_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载计划执行日志表'
    `);
    console.log('✅ download_schedule_logs表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS file_shares (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL COMMENT '用户ID',
        upload_id BIGINT NOT NULL COMMENT '上传文件ID',
        share_token VARCHAR(64) NOT NULL UNIQUE COMMENT '分享令牌',
        share_url VARCHAR(512) NOT NULL COMMENT '分享链接',
        password VARCHAR(255) NULL COMMENT '访问密码（加密）',
        expires_at DATETIME NULL COMMENT '过期时间',
        max_downloads INT NOT NULL DEFAULT 10 COMMENT '最大下载次数（0表示不限）',
        download_count INT NOT NULL DEFAULT 0 COMMENT '已下载次数',
        view_count INT NOT NULL DEFAULT 0 COMMENT '已查看次数',
        is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
        INDEX idx_file_shares_user_id (user_id),
        INDEX idx_file_shares_share_token (share_token),
        INDEX idx_file_shares_is_active (is_active),
        INDEX idx_file_shares_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件分享表'
    `);
    console.log('✅ file_shares表创建成功！');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS file_share_access_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        share_id BIGINT NOT NULL COMMENT '分享ID',
        ip_address VARCHAR(50) NULL COMMENT '访问IP',
        user_agent TEXT NULL COMMENT '用户代理',
        access_type ENUM('view', 'download') NOT NULL COMMENT '访问类型',
        accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
        FOREIGN KEY (share_id) REFERENCES file_shares(id) ON DELETE CASCADE,
        INDEX idx_file_share_access_logs_share_id (share_id),
        INDEX idx_file_share_access_logs_accessed_at (accessed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件分享访问日志表'
    `);
    console.log('✅ file_share_access_logs表创建成功！');

    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    return false;
  }
}

async function testConnection() {
  try {
    const database = await initializeDb();
    const connection = await database.getConnection();
    connection.release();
    console.log('✅ MySQL数据库连接池创建成功！');
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    return false;
  }
}

function getPool() {
  return initializeDb();
}

async function executeTransaction(callback) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const result = await callback(connection);
    
    await connection.commit();
    
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function executeWithRetry(sql, params, retries = 3) {
  const pool = await getPool();
  const MAX_DELAY = 5000;
  
  for (let i = 0; i < retries; i++) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.min(Math.pow(2, i) * 100, MAX_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  pool: initializeDb(),
  initializeDatabase,
  testConnection,
  getPool,
  executeTransaction,
  executeWithRetry
};