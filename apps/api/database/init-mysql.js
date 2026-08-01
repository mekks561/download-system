const { initializeDatabase, testConnection } = require('../src/config/mysql');

console.log('🚀 开始初始化MySQL数据库...\n');

async function initMySQL() {
  const connected = await testConnection();
  if (connected) {
    console.log('\n📋 初始化数据库表结构...');
    const success = await initializeDatabase();
    if (success) {
      console.log('\n🎉 MySQL数据库初始化完成！');
      console.log(`📁 数据库: ${process.env.MYSQL_DATABASE || 'download_manager'}`);
      console.log(`🌐 服务器: ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}`);
    }
  }
}

initMySQL().catch(console.error);
