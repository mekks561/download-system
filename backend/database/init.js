const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  console.log('🚀 开始初始化MySQL数据库...\n');

  // 1. 连接到MySQL服务器（不指定数据库）
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });
    console.log('✅ 连接到MySQL服务器成功！');
  } catch (error) {
    console.error('❌ 连接到MySQL服务器失败:', error.message);
    console.log('\n💡 提示: 请确保MySQL服务已启动，并且用户名密码配置正确！');
    process.exit(1);
  }

  try {
    // 2. 创建数据库
    console.log('\n📦 创建数据库...');
    await connection.execute(`
      CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'download_manager'}\`
      DEFAULT CHARACTER SET utf8mb4
      DEFAULT COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ 数据库创建成功！');

    // 3. 选择数据库
    await connection.execute(`USE \`${process.env.MYSQL_DATABASE || 'download_manager'}\``);

    // 4. 创建表结构
    console.log('\n📋 创建数据表...');
    
    // 创建users表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ users表创建成功！');

    // 创建downloads表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS downloads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        url VARCHAR(2048) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        status ENUM('pending', 'downloading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        downloaded_bytes BIGINT NOT NULL DEFAULT 0,
        total_bytes BIGINT NOT NULL DEFAULT 0,
        speed BIGINT NOT NULL DEFAULT 0,
        resume_position BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ downloads表创建成功！');

    // 创建uploads表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        status ENUM('pending', 'uploading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending',
        progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        uploaded_bytes BIGINT NOT NULL DEFAULT 0,
        total_bytes BIGINT NOT NULL DEFAULT 0,
        speed BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ uploads表创建成功！');

    console.log('\n🎉 数据库初始化完成！');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
