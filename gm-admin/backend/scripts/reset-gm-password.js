const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetPassword() {
  console.log('🔑 重置GM管理员密码...\n');

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

    const bcrypt = require('bcryptjs');
    const newPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await connection.execute(
      'UPDATE gm_users SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );

    console.log('\n✅ GM管理员密码重置成功！');
    console.log('\n📋 新的登录凭证：');
    console.log('   用户名：admin');
    console.log('   密码：Admin@123');
    console.log('\n⚠️  请立即登录并修改默认密码！');
    
  } catch (error) {
    console.error('❌ 密码重置失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetPassword();
