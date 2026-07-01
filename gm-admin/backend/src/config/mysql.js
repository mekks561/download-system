const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

const createPool = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'download_manager',
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0
    });
    
    console.log('✅ GM数据库连接池创建成功！');
    return pool;
  } catch (error) {
    console.error('❌ GM数据库连接池创建失败:', error);
    throw error;
  }
};

const getPool = async () => {
  if (!pool) {
    await createPool();
  }
  return pool;
};

const testConnection = async () => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT 1');
    console.log('✅ GM数据库连接测试成功！');
    return true;
  } catch (error) {
    console.error('❌ GM数据库连接测试失败:', error);
    return false;
  }
};

module.exports = { createPool, getPool, testConnection };
