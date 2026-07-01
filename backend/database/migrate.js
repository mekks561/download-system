const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateData() {
  console.log('🚀 开始从LowDB迁移数据到MySQL...\n');

  // 1. 读取LowDB数据
  const lowDbPath = path.join(__dirname, 'db.json');
  let lowDbData;
  try {
    lowDbData = JSON.parse(fs.readFileSync(lowDbPath, 'utf8'));
    console.log('✅ 读取LowDB数据成功！');
    console.log(`   - 用户数: ${lowDbData.users?.length || 0}`);
    console.log(`   - 下载记录数: ${lowDbData.downloads?.length || 0}`);
    console.log(`   - 上传记录数: ${lowDbData.uploads?.length || 0}`);
  } catch (error) {
    console.log('⚠️  LowDB数据文件不存在或读取失败，将跳过数据迁移');
    return;
  }

  // 2. 连接MySQL
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'download_manager'
    });
    console.log('\n✅ 连接到MySQL数据库成功！');
  } catch (error) {
    console.error('❌ 连接到MySQL数据库失败:', error.message);
    return;
  }

  try {
    // 3. 迁移用户数据
    console.log('\n📋 开始迁移用户数据...');
    let userCount = 0;
    if (lowDbData.users && lowDbData.users.length > 0) {
      for (const user of lowDbData.users) {
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO users (id, username, email, password, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              user.username,
              user.email,
              user.password,
              user.created_at,
              user.updated_at
            ]
          );
          userCount++;
        }
      }
      console.log(`✅ 用户数据迁移完成，迁移了 ${userCount} 个用户`);
    } else {
      console.log('ℹ️  没有用户数据需要迁移');
    }

    // 4. 迁移下载记录
    console.log('\n📋 开始迁移下载记录...');
    let downloadCount = 0;
    if (lowDbData.downloads && lowDbData.downloads.length > 0) {
      for (const download of lowDbData.downloads) {
        const [existing] = await connection.execute(
          'SELECT id FROM downloads WHERE id = ?',
          [download.id]
        );
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO downloads 
             (id, user_id, url, filename, status, progress, downloaded_bytes, 
              total_bytes, speed, resume_position, created_at, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              download.id,
              download.user_id,
              download.url,
              download.filename,
              download.status,
              download.progress,
              download.downloaded_bytes,
              download.total_bytes,
              download.speed,
              download.resume_position,
              download.created_at,
              download.completed_at
            ]
          );
          downloadCount++;
        }
      }
      console.log(`✅ 下载记录迁移完成，迁移了 ${downloadCount} 条记录`);
    } else {
      console.log('ℹ️  没有下载记录需要迁移');
    }

    // 5. 迁移上传记录
    console.log('\n📋 开始迁移上传记录...');
    let uploadCount = 0;
    if (lowDbData.uploads && lowDbData.uploads.length > 0) {
      for (const upload of lowDbData.uploads) {
        const [existing] = await connection.execute(
          'SELECT id FROM uploads WHERE id = ?',
          [upload.id]
        );
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO uploads 
             (id, user_id, filename, original_filename, file_path, status, 
              progress, uploaded_bytes, total_bytes, speed, created_at, completed_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              upload.id,
              upload.user_id,
              upload.filename,
              upload.original_filename,
              upload.file_path,
              upload.status,
              upload.progress,
              upload.uploaded_bytes,
              upload.total_bytes,
              upload.speed,
              upload.created_at,
              upload.completed_at
            ]
          );
          uploadCount++;
        }
      }
      console.log(`✅ 上传记录迁移完成，迁移了 ${uploadCount} 条记录`);
    } else {
      console.log('ℹ️  没有上传记录需要迁移');
    }

    console.log('\n🎉 数据迁移完成！');
    console.log(`📊 统计: 用户 ${userCount} 个, 下载 ${downloadCount} 条, 上传 ${uploadCount} 条`);

  } catch (error) {
    console.error('❌ 数据迁移失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateData();
