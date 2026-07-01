const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initGmDatabase() {
  console.log('🚀 开始初始化GM后台数据库...\n');

  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });

    console.log('✅ 连接到MySQL服务器成功！');

    const dbName = process.env.MYSQL_DATABASE || 'download_manager';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 "${dbName}" 已准备好！`);
    
    await connection.query(`USE \`${dbName}\``);

    console.log('\n📋 创建GM用户表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gm_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(100),
        role ENUM('viewer', 'moderator', 'admin', 'super_admin') NOT NULL DEFAULT 'viewer',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        failed_login_attempts INT NOT NULL DEFAULT 0,
        last_login_at DATETIME,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ GM用户表创建成功！');

    console.log('\n👤 创建默认超级管理员账号...');
    const defaultUsername = process.env.GM_DEFAULT_USERNAME || 'admin';
    const defaultPassword = process.env.GM_DEFAULT_PASSWORD || 'Admin@123';
    const defaultEmail = process.env.GM_DEFAULT_EMAIL || 'admin@example.com';
    
    const [existing] = await connection.query(
      'SELECT id FROM gm_users WHERE username = ? OR email = ?',
      [defaultUsername, defaultEmail]
    );

    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      await connection.query(
        'INSERT INTO gm_users (username, password, email, name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [defaultUsername, hashedPassword, defaultEmail, '系统管理员', 'super_admin', true]
      );
      
      console.log('✅ 默认超级管理员账户创建成功！');
      console.log(`   用户名: ${defaultUsername}`);
      console.log(`   密码: ${defaultPassword}`);
      console.log(`   邮箱: ${defaultEmail}`);
      console.log('   ⚠️  请立即登录并修改默认密码！');
    } else {
      console.log('ℹ️  默认超级管理员账户已存在，跳过创建。');
    }

    console.log('\n🎉 GM后台数据库初始化完成！');
    console.log(`\n📌 GM后台访问地址: http://localhost:${process.env.GM_PORT || 5002}`);
    
  } catch (error) {
    console.error('❌ GM数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initGmDatabase();
