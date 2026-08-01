const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DownloadScheduler {
  constructor() {
    this.pool = null;
    this.checkInterval = 60000;
  }

  async init() {
    try {
      this.pool = await mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'download_manager',
        connectionLimit: 5
      });

      console.log('✅ 下载计划调度引擎数据库连接成功！');
      console.log(`⏰ 调度引擎启动，检车间隔: ${this.checkInterval / 1000}秒`);
      
      await this.startScheduler();
    } catch (error) {
      console.error('❌ 调度引擎初始化失败:', error);
      process.exit(1);
    }
  }

  async startScheduler() {
    console.log('🚀 下载计划调度引擎开始运行...\n');
    
    await this.checkAndExecuteSchedules();
    
    setInterval(async () => {
      await this.checkAndExecuteSchedules();
    }, this.checkInterval);
  }

  async checkAndExecuteSchedules() {
    try {
      const now = new Date();
      
      const [schedules] = await this.pool.execute(
        `SELECT ds.*, u.username, u.email 
         FROM download_schedules ds
         JOIN users u ON ds.user_id = u.id
         WHERE ds.status = 'active' 
         AND ds.next_run_at <= ?
         ORDER BY ds.priority DESC, ds.next_run_at ASC`,
        [now]
      );

      if (schedules.length === 0) {
        return;
      }

      console.log(`\n📋 发现 ${schedules.length} 个待执行的下载计划`);

      for (const schedule of schedules) {
        await this.executeSchedule(schedule);
      }
    } catch (error) {
      console.error('❌ 检查和执行下载计划失败:', error);
    }
  }

  async executeSchedule(schedule) {
    console.log(`\n🔄 执行下载计划 #${schedule.id}: ${schedule.url}`);
    
    try {
      await this.downloadFile(schedule);
      
      const nextRunAt = this.calculateNextRunTime(
        schedule.schedule_type,
        schedule.schedule_time,
        schedule.schedule_day,
        schedule.schedule_date,
        schedule.next_run_at
      );

      await this.pool.execute(
        `UPDATE download_schedules 
         SET last_run_at = NOW(),
             next_run_at = ?,
             total_runs = total_runs + 1
         WHERE id = ?`,
        [nextRunAt, schedule.id]
      );

      await this.logExecution(schedule.id, schedule.user_id, schedule.url, schedule.filename, 'success');

      console.log(`✅ 下载计划 #${schedule.id} 执行成功`);
      
      if (schedule.schedule_type === 'once') {
        await this.pool.execute(
          `UPDATE download_schedules SET status = 'completed' WHERE id = ?`,
          [schedule.id]
        );
        console.log(`📌 一次性任务 #${schedule.id} 已完成`);
      }
    } catch (error) {
      console.error(`❌ 下载计划 #${schedule.id} 执行失败:`, error.message);
      
      await this.logExecution(
        schedule.id, 
        schedule.user_id, 
        schedule.url, 
        schedule.filename, 
        'failed',
        error.message
      );
    }
  }

  async downloadFile(schedule) {
    return new Promise((resolve, reject) => {
      const downloadDir = process.env.DOWNLOAD_DIR || path.join(process.cwd(), 'downloads');
      
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const filename = schedule.filename || this.extractFilename(schedule.url);
      const filepath = path.join(downloadDir, filename);

      console.log(`📥 开始下载: ${filename}`);

      const file = fs.createWriteStream(filepath);
      
      const request = https.get(schedule.url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`🔀 重定向到: ${redirectUrl}`);
          file.close();
          fs.unlinkSync(filepath);
          https.get(redirectUrl, (redirectResponse) => {
            this.downloadToFile(redirectResponse, file, filepath, resolve, reject);
          }).on('error', reject);
        } else {
          this.downloadToFile(response, file, filepath, resolve, reject);
        }
      });

      request.on('error', (error) => {
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        reject(error);
      });
    });
  }

  downloadToFile(response, file, filepath, resolve, reject) {
    const totalSize = parseInt(response.headers['content-length'] || '0');
    let downloaded = 0;

    response.on('data', (chunk) => {
      downloaded += chunk.length;
      if (totalSize > 0) {
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r📥 下载进度: ${percent}%`);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log(`\n✅ 文件保存到: ${filepath}`);
      resolve(filepath);
    });

    file.on('error', (error) => {
      fs.unlinkSync(filepath);
      reject(error);
    });

    response.on('error', (error) => {
      file.close();
      fs.unlinkSync(filepath);
      reject(error);
    });
  }

  extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname);
      return filename || `download_${Date.now()}`;
    } catch {
      return `download_${Date.now()}`;
    }
  }

  calculateNextRunTime(schedule_type, schedule_time, schedule_day, schedule_date, currentRunTime) {
    const [hours, minutes] = schedule_time.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date(currentRunTime || now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule_type) {
      case 'once':
        return null;

      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;

      case 'weekly':
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        const targetDay = dayMap[schedule_day.toLowerCase()] ?? 1;
        const currentDay = nextRun.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }

    return nextRun;
  }

  async logExecution(schedule_id, user_id, url, filename, status, error_message = null) {
    try {
      await this.pool.execute(
        `INSERT INTO download_schedule_logs 
         (schedule_id, user_id, url, filename, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [schedule_id, user_id, url, filename, status, error_message]
      );
    } catch (error) {
      console.error('❌ 记录执行日志失败:', error);
    }
  }

  async stop() {
    if (this.pool) {
      await this.pool.end();
      console.log('\n👋 下载计划调度引擎已停止');
    }
  }
}

const scheduler = new DownloadScheduler();

process.on('SIGINT', async () => {
  console.log('\n\n🛑 收到停止信号，正在关闭调度引擎...');
  await scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 收到终止信号，正在关闭调度引擎...');
  await scheduler.stop();
  process.exit(0);
});

scheduler.init().catch((error) => {
  console.error('❌ 调度引擎启动失败:', error);
  process.exit(1);
});
