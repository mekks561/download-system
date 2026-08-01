const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyTables() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'download_manager'
  });

  console.log('\n📊 验证下载计划调度数据库表...\n');

  const [tables] = await connection.execute('SHOW TABLES LIKE "download_schedule%"');
  
  console.log('✅ 已创建的表：');
  tables.forEach(t => {
    const tableName = Object.values(t)[0];
    console.log(`   - ${tableName}`);
  });

  console.log('\n📋 表结构验证：');
  
  const [schedulesDesc] = await connection.execute('DESCRIBE download_schedules');
  console.log('\n   download_schedules 表字段：');
  schedulesDesc.slice(0, 5).forEach(field => {
    console.log(`     - ${field.Field} (${field.Type})`);
  });
  console.log(`     ... 共 ${schedulesDesc.length} 个字段`);

  const [logsDesc] = await connection.execute('DESCRIBE download_schedule_logs');
  console.log('\n   download_schedule_logs 表字段：');
  logsDesc.slice(0, 5).forEach(field => {
    console.log(`     - ${field.Field} (${field.Type})`);
  });
  console.log(`     ... 共 ${logsDesc.length} 个字段`);

  console.log('\n✅ 数据库表验证完成！\n');
  
  await connection.end();
}

verifyTables().catch(console.error);