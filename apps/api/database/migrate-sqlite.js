const fs = require('fs');
const path = require('path');
const { db, initializeDatabase, testConnection } = require('../src/config/sqlite');

console.log('🚀 开始从LowDB迁移数据到SQLite...\n');

function migrateData() {
  const lowDbPath = path.join(__dirname, 'db.json');
  let lowDbData;

  try {
    if (fs.existsSync(lowDbPath)) {
      lowDbData = JSON.parse(fs.readFileSync(lowDbPath, 'utf8'));
      console.log('✅ 读取LowDB数据成功！');
      console.log(`   - 用户数: ${lowDbData.users?.length || 0}`);
      console.log(`   - 下载记录数: ${lowDbData.downloads?.length || 0}`);
      console.log(`   - 上传记录数: ${lowDbData.uploads?.length || 0}`);
    } else {
      console.log('⚠️  LowDB数据文件不存在，将创建空数据库');
      lowDbData = { users: [], downloads: [], uploads: [] };
    }
  } catch (error) {
    console.log('⚠️  LowDB数据文件读取失败，将创建空数据库');
    lowDbData = { users: [], downloads: [], uploads: [] };
  }

  if (!testConnection()) {
    console.error('❌ 无法连接到SQLite数据库');
    process.exit(1);
  }

  initializeDatabase();
  console.log('\n📋 开始迁移数据...');

  const migrateUsers = db.transaction((users) => {
    let count = 0;
    for (const user of users || []) {
      try {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO users (username, email, password, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(user.username, user.email, user.password, user.created_at, user.updated_at);
        count++;
      } catch (error) {
        console.error(`⚠️  迁移用户失败: ${user.username}`, error.message);
      }
    }
    return count;
  });

  const migrateDownloads = db.transaction((downloads) => {
    let count = 0;
    for (const download of downloads || []) {
      try {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO downloads
          (user_id, url, filename, status, progress, downloaded_bytes, total_bytes, speed, resume_position, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          download.user_id, download.url, download.filename,
          download.status, download.progress, download.downloaded_bytes,
          download.total_bytes, download.speed, download.resume_position,
          download.created_at, download.completed_at
        );
        count++;
      } catch (error) {
        console.error(`⚠️  迁移下载记录失败: ${download.filename}`, error.message);
      }
    }
    return count;
  });

  const migrateUploads = db.transaction((uploads) => {
    let count = 0;
    for (const upload of uploads || []) {
      try {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO uploads
          (user_id, filename, original_filename, file_path, status, progress, uploaded_bytes, total_bytes, speed, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          upload.user_id, upload.filename, upload.original_filename,
          upload.file_path, upload.status, upload.progress,
          upload.uploaded_bytes, upload.total_bytes, upload.speed,
          upload.created_at, upload.completed_at
        );
        count++;
      } catch (error) {
        console.error(`⚠️  迁移上传记录失败: ${upload.original_filename}`, error.message);
      }
    }
    return count;
  });

  const userCount = migrateUsers(lowDbData.users);
  const downloadCount = migrateDownloads(lowDbData.downloads);
  const uploadCount = migrateUploads(lowDbData.uploads);

  console.log(`✅ 用户数据迁移完成: ${userCount} 个用户`);
  console.log(`✅ 下载记录迁移完成: ${downloadCount} 条记录`);
  console.log(`✅ 上传记录迁移完成: ${uploadCount} 条记录`);
  console.log('\n🎉 数据迁移完成！');
  console.log(`📁 SQLite数据库文件: backend/database/download_manager.db`);
}

migrateData();
