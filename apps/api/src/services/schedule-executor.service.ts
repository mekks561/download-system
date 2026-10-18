import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../config/prisma';
import { start } from './download-engine.service';
import { emitSystemNotification } from '../config/socket';
import { cleanupExpiredResources, scanStorage } from './resource.service';
import { getSettings } from './settings.service';

type ScheduledTask = {
  id: number;
  task: ScheduledTask;
};

const activeTasks = new Map<number, ScheduledTask>();

/**
 * 初始化调度器：加载数据库中所有已启用的任务
 */
export async function initScheduler() {
  const schedules = await prisma.schedule.findMany({
    where: { isEnabled: true },
  });

  console.log(`[Scheduler] 正在初始化，共加载 ${schedules.length} 个启用任务`);

  for (const schedule of schedules) {
    try {
      registerSchedule(schedule);
    } catch (err) {
      console.error(`[Scheduler] 注册任务 #${schedule.id} 失败:`, err);
    }
  }

  // 注册系统治理任务：每天凌晨 2 点执行
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] 正在执行系统治理任务 (清理过期资源与扫描存储)...');
    try {
      const settings = await getSettings();
      const cleanupResult = await cleanupExpiredResources(settings.autoCleanupDays);
      console.log(`[Scheduler] 资源清理完成：删除文件 ${cleanupResult.cleanedFilesCount} 个，释放空间 ${(Number(cleanupResult.cleanedBytes) / 1024 / 1024).toFixed(2)} MB`);
      
      await scanStorage();
      console.log('[Scheduler] 存储占用扫描完成');
    } catch (err) {
      console.error('[Scheduler] 系统治理任务执行失败:', err);
    }
  });
}

/**
 * 注册单个调度任务
 */
export function registerSchedule(schedule: { id: number; cron: string; url: string; userId: number; filename: string | null }) {
  // 如果任务已在运行，先停止
  if (activeTasks.has(schedule.id)) {
    unregisterSchedule(schedule.id);
  }

  // 校验 cron 表达式
  if (!cron.validate(schedule.cron)) {
    throw new Error(`无效的 Cron 表达式: ${schedule.cron}`);
  }

  const task = cron.schedule(schedule.cron, () => {
    void executeTask(schedule.id);
  });

  activeTasks.set(schedule.id, { id: schedule.id, task });
  console.log(`[Scheduler] 任务 #${schedule.id} 已注册，表达式: ${schedule.cron}`);
}

/**
 * 取消注册调度任务
 */
export function unregisterSchedule(id: number) {
  const scheduled = activeTasks.get(id);
  if (scheduled) {
    scheduled.task.stop();
    activeTasks.delete(id);
    console.log(`[Scheduler] 任务 #${id} 已取消注册`);
  }
}

/**
 * 执行具体的调度任务
 */
async function executeTask(scheduleId: number) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { user: true },
  });

  if (!schedule || !schedule.isEnabled) {
    unregisterSchedule(scheduleId);
    return;
  }

  const startedAt = new Date();
  console.log(`[Scheduler] 正在执行任务 #${schedule.id}: ${schedule.url}`);

  // 1. 创建调度日志 (Running)
  const log = await prisma.scheduleLog.create({
    data: {
      scheduleId,
      status: 'running',
      message: '任务已触发',
      startedAt,
    },
  });

  try {
    // 2. 创建下载任务
    const download = await prisma.download.create({
      data: {
        userId: schedule.userId,
        url: schedule.url,
        filename: schedule.filename || 'scheduled-download',
        status: 'pending',
      },
    });

    // 3. 启动下载引擎
    await start(download.id, schedule.userId);

    // 4. 更新调度状态与日志
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: startedAt },
    });

    await prisma.scheduleLog.update({
      where: { id: log.id },
      data: {
        status: 'success',
        message: `成功触发下载任务 #${download.id}`,
        finishedAt: new Date(),
      },
    });

    // 5. 推送通知
    emitSystemNotification(
      schedule.userId,
      '定时任务已触发',
      `您的定时下载任务 "${schedule.filename || schedule.url}" 已开始执行。`,
      'success'
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] 任务 #${schedule.id} 执行失败:`, message);

    await prisma.scheduleLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        message: `触发失败: ${message}`,
        finishedAt: new Date(),
      },
    });

    emitSystemNotification(
      schedule.userId,
      '定时任务执行失败',
      `您的定时下载任务执行失败: ${message}`,
      'error'
    );
  }
}
