const initSqlJs = require('sql.js');
const { pool, initializeDatabase } = require('../src/config/mysql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 开始从SQLite迁移数据到MySQL...\n');

async function migrateData() {
  // 1. 读取SQLite数据
  const dbPath = path.join(__dirname, 'download_manager.db');
  let lowDbData;

  try {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      const sqliteDb = new SQL.Database(fileBuffer);
      
      const usersResult = sqliteDb.exec('SELECT * FROM users');
      const downloadsResult = sqliteDb.exec('SELECT * FROM downloads');
      const uploadsResult = sqliteDb.exec('SELECT * FROM uploads');
      
      lowDbData = {
        users: usersResult.length > 0 ? usersResult[0].values.map(row => ({
          id: row[0], username: row[1], email: row[2], password: row[3],
          created_at: row[4], updated_at: row[5]
        })) : [],
        downloads: downloadsResult.length > 0 ? downloadsResult[0].values.map(row => ({
          id: row[0], user_id: row[1], url: row[2], filename: row[3],
          status: row[4], progress: row[5], downloaded_bytes: row[6],
          total_bytes: row[7], speed: row[8], resume_position: row[9],
          created_at: row[10], completed_at: row[11]
        })) : [],
        uploads: uploadsResult.length > 0 ? uploadsResult[0].values.map(row => ({
          id: row[0], user_id: row[1], filename: row[2], original_filename: row[3],
          file_path: row[4], status: row[5], progress: row[6],
          uploaded_bytes: row[7], total_bytes: row[8], speed: row[9],
          created_at: row[10], completed_at: row[11]
        })) : []
      };
      
      console.log('✅ 读取SQLite数据成功！');
      console.log(`   - 用户数: ${lowDbData.users.length}`);
      console.log(`   - 下载记录数: ${lowDbData.downloads.length}`);
      console.log(`   - 上传记录数: ${lowDbData.uploads.length}`);
    } else {
      console.log('⚠️  SQLite数据库文件不存在，跳过迁移');
      lowDbData = { users: [], downloads: [], uploads: [] };
    }
  } catch (error) {
    console.log('⚠️  读取SQLite数据失败:', error.message);
    lowDbData = { users: [], downloads: [], uploads: [] };
  }

  // 2. 初始化MySQL数据库
  console.log('\n📦 初始化MySQL数据库...');
  await initializeDatabase();

  // 3. 迁移数据到MySQL
  console.log('\n📋 开始迁移数据到MySQL...\n');
  
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ 获取MySQL连接成功！');

    // 迁移用户
    console.log('👥 迁移用户数据...');
    let userCount = 0;
    for (const user of lowDbData.users) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO users (username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [user.username, user.email, user.password, user.created_at, user.updated_at]
        );
        userCount++;
      } catch (error) {
        console.error(`⚠️  迁移用户失败: ${user.username}`);
      }
    }
    console.log(`✅ 用户数据迁移完成: ${userCount} 个用户`);

    // 迁移下载记录
    console.log('\n📥 迁移下载记录...');
    let downloadCount = 0;
    for (const download of lowDbData.downloads) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO downloads (user_id, url, filename, status, progress, downloaded_bytes, total_bytes, speed, resume_position, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [download.user_id, download.url, download.filename, download.status, download.progress, download.downloaded_bytes, download.total_bytes, download.speed, download.resume_position, download.created_at, download.completed_at]
        );
        downloadCount++;
      } catch (error) {
        console.error(`⚠️  迁移下载记录失败: ${download.filename}`);
      }
    }
    console.log(`✅ 下载记录迁移完成: ${downloadCount} 条记录`);

    // 迁移上传记录
    console.log('\n📤 迁移上传记录...');
    let uploadCount = 0;
    for (const upload of lowDbData.uploads) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO uploads (user_id, filename, original_filename, file_path, status, progress, uploaded_bytes, total_bytes, speed, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [upload.user_id, upload.filename, upload.original_filename, upload.file_path, upload.status, upload.progress, upload.uploaded_bytes, upload.total_bytes, upload.speed, upload.created_at, upload.completed_at]
        );
        uploadCount++;
      } catch (error) {
        console.error(`⚠️  迁移上传记录失败: ${upload.original_filename}`);
      }
    }
    console.log(`✅ 上传记录迁移完成: ${uploadCount} 条记录`);

    console.log('\n🎉 数据迁移完成！');
    console.log(`📊 统计: 用户 ${userCount} 个, 下载 ${downloadCount} 条, 上传 ${uploadCount} 条`);
    console.log(`\n🌐 MySQL数据库: ${process.env.MYSQL_DATABASE}`);
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error.message);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

migrateData().catch(console.error);
