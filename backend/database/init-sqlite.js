const { initializeDatabase, testConnection } = require('../src/config/sqlite');

console.log('🚀 开始初始化SQLite数据库...\n');

async function initSQLite() {
  if (testConnection()) {
    console.log('\n📋 初始化数据库表结构...');
    initializeDatabase();
    console.log('✅ 数据库表创建成功！');
    console.log('\n🎉 SQLite数据库初始化完成！');
    console.log('📁 数据库文件位置: backend/database/download_manager.db');
  } else {
    console.error('❌ 数据库初始化失败');
    process.exit(1);
  }
}

initSQLite();
