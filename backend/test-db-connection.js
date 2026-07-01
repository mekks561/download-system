const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🧪 开始测试数据库连接...\n');
  console.log('📋 连接配置:');
  console.log(`   主机: ${process.env.MYSQL_HOST || 'localhost'}`);
  console.log(`   端口: ${process.env.MYSQL_PORT || '3306'}`);
  console.log(`   用户: ${process.env.MYSQL_USER || 'root'}`);
  console.log(`   数据库: ${process.env.MYSQL_DATABASE || 'download_manager'}`);
  console.log('');

  try {
    console.log('🔗 尝试连接到MySQL服务器...');
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || ''
    });
    console.log('✅ MySQL服务器连接成功！');

    console.log('\n📊 检查数据库是否存在...');
    const dbName = process.env.MYSQL_DATABASE || 'download_manager';
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${dbName}'`);
    
    if (databases.length > 0) {
      console.log(`✅ 数据库 "${process.env.MYSQL_DATABASE || 'download_manager'}" 已存在！`);
      
      await connection.query(`USE \`${process.env.MYSQL_DATABASE || 'download_manager'}\``);
      
      console.log('\n📋 检查数据表...');
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`✅ 找到 ${tables.length} 个数据表:`);
      
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        console.log(`   - ${tableName}: ${countResult[0].count} 条记录`);
      }
    } else {
      console.log(`⚠️ 数据库 "${process.env.MYSQL_DATABASE || 'download_manager'}" 不存在。`);
      console.log('   当启动服务时会自动创建这个数据库。');
    }

    await connection.end();
    console.log('\n🎯 数据库连接测试完成！');

  } catch (error) {
    console.log('\n❌ 数据库连接测试失败！');
    console.error('\n错误信息:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 建议:');
      console.log('   1. 确保MySQL服务正在运行');
      console.log('   2. 检查连接配置（host、port、user、password）');
      console.log('   3. 如果使用SQLite，请在.env中设置 DB_TYPE=sqlite');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 建议:');
      console.log('   1. 检查用户名和密码是否正确');
      console.log('   2. 如果默认密码不是123456，请在.env中修改 MYSQL_PASSWORD');
    }
    
    console.log('\n📋 当前 .env 配置:');
    console.log(`   MYSQL_HOST=${process.env.MYSQL_HOST}`);
    console.log(`   MYSQL_PORT=${process.env.MYSQL_PORT}`);
    console.log(`   MYSQL_USER=${process.env.MYSQL_USER}`);
    console.log(`   MYSQL_PASSWORD=${'*'.repeat(process.env.MYSQL_PASSWORD?.length || 0)}`);
    console.log(`   MYSQL_DATABASE=${process.env.MYSQL_DATABASE}`);
    console.log(`   DB_TYPE=${process.env.DB_TYPE}`);
    
    process.exit(1);
  }
}

testDatabaseConnection();
