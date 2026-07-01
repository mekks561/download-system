const { getPool } = require('../config/mysql');
const { logger } = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.checkIntervalMs = 60000; // 每分钟检查一次
  }

  /**
   * 启动计划任务执行器
   */
  start() {
    if (this.isRunning) {
      logger.warn('计划任务执行器已在运行中');
      return;
    }

    this.isRunning = true;
    logger.info('⏰ 计划任务执行器已启动');

    // 立即执行一次检查
    this.checkAndExecute();

    // 设置定时检查
    this.checkInterval = setInterval(() => {
      this.checkAndExecute();
    }, this.checkIntervalMs);
  }

  /**
   * 停止计划任务执行器
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('⏰ 计划任务执行器已停止');
  }

  /**
   * 检查并执行到期任务
   */
  async checkAndExecute() {
    try {
      const pool = await getPool();
      const now = new Date();

      // 查找需要执行的任务
      const [schedules] = await pool.execute(
        `SELECT * FROM download_schedules 
         WHERE status = 'active' 
         AND next_run_at <= ?
         ORDER BY priority DESC, next_run_at ASC`,
        [now]
      );

      if (schedules.length === 0) {
        return;
      }

      logger.info(`发现 ${schedules.length} 个待执行的计划任务`);

      // 执行每个任务
      for (const schedule of schedules) {
        await this.executeSchedule(pool, schedule);
      }

    } catch (error) {
      logger.error('检查计划任务失败', { error: error.message });
    }
  }

  /**
   * 执行单个计划任务
   */
  async executeSchedule(pool, schedule) {
    try {
      logger.info(`执行计划任务 #${schedule.id}: ${schedule.filename || schedule.url}`);

      // 创建下载任务
      const [downloadResult] = await pool.execute(
        `INSERT INTO downloads 
         (user_id, url, filename, status, progress, downloaded_bytes, total_bytes, speed)
         VALUES (?, ?, ?, 'pending', 0, 0, 0, 0)`,
        [schedule.user_id, schedule.url, schedule.filename || this.extractFilename(schedule.url)]
      );

      // 记录执行日志
      await pool.execute(
        `INSERT INTO download_schedule_logs 
         (user_id, schedule_id, status)
         VALUES (?, ?, 'success')`,
        [schedule.user_id, schedule.id]
      );

      // 更新计划任务状态
      const nextRunAt = this.calculateNextRunTime(schedule);
      
      await pool.execute(
        `UPDATE download_schedules 
         SET last_run_at = ?, 
             next_run_at = ?, 
             total_runs = total_runs + 1,
             status = CASE 
               WHEN schedule_type = 'once' THEN 'completed'
               ELSE status
             END
         WHERE id = ?`,
        [new Date(), nextRunAt, schedule.id]
      );

      logger.info(`计划任务 #${schedule.id} 执行成功，下载任务ID: ${downloadResult.insertId}`);

    } catch (error) {
      // 记录失败日志
      await pool.execute(
        `INSERT INTO download_schedule_logs 
         (user_id, schedule_id, status, error_message)
         VALUES (?, ?, 'failed', ?)`,
        [schedule.user_id, schedule.id, error.message]
      );

      // 更新计划任务错误信息
      await pool.execute(
        `UPDATE download_schedules 
         SET error_message = ?, 
             total_runs = total_runs + 1
         WHERE id = ?`,
        [error.message, schedule.id]
      );

      logger.error(`计划任务 #${schedule.id} 执行失败`, { error: error.message });
    }
  }

  /**
   * 从URL提取文件名
   */
  extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'unknown_file';
    } catch {
      return 'download_file';
    }
  }

  /**
   * 计算下次执行时间
   */
  calculateNextRunTime(schedule) {
    const now = new Date();
    const [hours, minutes] = schedule.schedule_time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.schedule_type) {
      case 'once':
        // 一次性任务，设置到明天
        nextRun.setDate(nextRun.getDate() + 1);
        break;

      case 'daily':
        // 每日任务，如果当前时间已过则设置为明天
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        // 每周任务
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        const targetDay = dayMap[schedule.schedule_day?.toLowerCase()] ?? 1;
        const currentDay = now.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        nextRun.setDate(now.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        // 每月任务
        if (schedule.schedule_date) {
          const [year, month] = schedule.schedule_date.split('-').map(Number);
          nextRun.setFullYear(year, month - 1, 1);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        } else {
          // 默认下个月同一天
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  /**
   * 获取执行器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      lastCheck: this.lastCheckTime || null
    };
  }
}

// 单例模式
const schedulerService = new SchedulerService();

module.exports = schedulerService;