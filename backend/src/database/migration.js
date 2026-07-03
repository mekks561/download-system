const path = require('path');
const fs = require('fs');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function createMigration(name) {
  const timestamp = Date.now();
  const filename = `${timestamp}_${name}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  const content = `-- =============================================
-- 迁移: ${name}
-- 创建时间: ${new Date().toISOString()}
-- =============================================

-- 上迁移 (执行)
-- TODO: 添加需要执行的SQL语句

-- 下迁移 (回滚)
-- TODO: 添加回滚SQL语句
`;

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ 迁移文件创建成功: ${filename}`);
}

function getMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

function parseMigration(content) {
  const upMatch = content.match(/-- 上迁移[\s\S]*?(?=-- 下迁移|$)/);
  const downMatch = content.match(/-- 下迁移[\s\S]*$/);

  return {
    up: upMatch ? upMatch[0].replace(/-- 上迁移[\s\S]*?\n?/, '').trim() : '',
    down: downMatch ? downMatch[0].replace(/-- 下迁移[\s\S]*?\n?/, '').trim() : ''
  };
}

async function runMigrations(database) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 迁移目录不存在，跳过迁移');
    return;
  }

  const migrations = getMigrations();
  if (migrations.length === 0) {
    console.log('📋 没有需要执行的迁移');
    return;
  }

  await database.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移记录表'
  `);

  const [executedMigrations] = await database.execute('SELECT filename FROM migrations');
  const executedSet = new Set(executedMigrations.map(m => m.filename));

  for (const filename of migrations) {
    if (executedSet.has(filename)) {
      console.log(`⏭️ 跳过已执行的迁移: ${filename}`);
      continue;
    }

    console.log(`🚀 执行迁移: ${filename}`);
    
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    const { up } = parseMigration(content);

    if (!up) {
      console.warn(`⚠️ 迁移 ${filename} 没有上迁移语句，跳过`);
      continue;
    }

    try {
      const sqlStatements = up.split(';').filter(s => s.trim());
      for (const sql of sqlStatements) {
        if (sql.trim()) {
          await database.execute(sql);
        }
      }

      await database.execute(
        'INSERT INTO migrations (filename) VALUES (?)',
        [filename]
      );

      console.log(`✅ 迁移 ${filename} 执行成功`);
    } catch (error) {
      console.error(`❌ 迁移 ${filename} 执行失败:`, error.message);
      throw error;
    }
  }

  console.log('🎉 所有迁移执行完成');
}

async function rollbackMigration(database, steps = 1) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 迁移目录不存在');
    return;
  }

  const [executedMigrations] = await database.execute(
    'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT ?',
    [steps]
  );

  if (executedMigrations.length === 0) {
    console.log('📋 没有已执行的迁移可回滚');
    return;
  }

  for (const { filename } of executedMigrations) {
    console.log(`↩️ 回滚迁移: ${filename}`);
    
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    const { down } = parseMigration(content);

    if (!down) {
      console.warn(`⚠️ 迁移 ${filename} 没有下迁移语句，跳过回滚`);
      continue;
    }

    try {
      const sqlStatements = down.split(';').filter(s => s.trim());
      for (const sql of sqlStatements) {
        if (sql.trim()) {
          await database.execute(sql);
        }
      }

      await database.execute('DELETE FROM migrations WHERE filename = ?', [filename]);

      console.log(`✅ 迁移 ${filename} 回滚成功`);
    } catch (error) {
      console.error(`❌ 迁移 ${filename} 回滚失败:`, error.message);
      throw error;
    }
  }

  console.log('🎉 回滚完成');
}

async function showMigrationStatus(database) {
  try {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_migrations_filename (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移记录表'
    `);
  } catch {}

  const migrations = getMigrations();
  const [executedMigrations] = await database.execute('SELECT filename, executed_at FROM migrations ORDER BY executed_at');
  const executedMap = new Map(executedMigrations.map(m => [m.filename, m.executed_at]));

  console.log('\n📊 迁移状态:');
  console.log('────────────────────────────────────────');
  
  migrations.forEach(filename => {
    const executedAt = executedMap.get(filename);
    if (executedAt) {
      console.log(`✅ ${filename}`);
      console.log(`   执行时间: ${executedAt}`);
    } else {
      console.log(`⏳ ${filename}`);
      console.log(`   状态: 待执行`);
    }
  });

  console.log('────────────────────────────────────────');
  console.log(`总计: ${migrations.length} 个迁移`);
  console.log(`已执行: ${executedMap.size} 个`);
  console.log(`待执行: ${migrations.length - executedMap.size} 个\n`);
}

module.exports = {
  createMigration,
  runMigrations,
  rollbackMigration,
  showMigrationStatus,
  getMigrations
};
