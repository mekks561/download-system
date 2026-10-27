import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { serializeSchedule, serializeScheduleLog } from '../utils/serialize.js';
import type { ScheduleCreate } from '@dm/shared';
import { registerSchedule, unregisterSchedule } from './schedule-executor.service.js';

export async function listSchedules(userId: number) {
  const rows = await prisma.schedule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeSchedule);
}

export async function createSchedule(userId: number, input: ScheduleCreate) {
  const row = await prisma.schedule.create({
    data: {
      userId,
      url: input.url,
      filename: input.filename ?? null,
      cron: input.cron,
      type: input.type,
      isEnabled: true,
    },
  });

  const serialized = serializeSchedule(row);
  // 如果新创建的任务是启用的，则注册到调度器
  if (row.isEnabled) {
    registerSchedule(row);
  }
  return serialized;
}

export async function updateSchedule(
  id: number,
  userId: number,
  data: { isEnabled?: boolean; cron?: string },
) {
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '调度不存在');
  // 仅取白名单字段，防止越权改写 userId/url 等
  const { isEnabled, cron } = data;
  const row = await prisma.schedule.update({
    where: { id },
    data: { isEnabled, cron },
  });

  // 更新调度器中的任务状态
  if (row.isEnabled) {
    registerSchedule(row);
  } else {
    unregisterSchedule(row.id);
  }

  return serializeSchedule(row);
}

export async function deleteSchedule(id: number, userId: number) {
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '调度不存在');
  await prisma.schedule.delete({ where: { id } });
  // 从调度器中移除
  unregisterSchedule(id);
}

export async function listScheduleLogs(scheduleId: number, userId: number) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, userId },
  });
  if (!schedule) throw new AppError('NOT_FOUND', 404, '调度不存在');
  const rows = await prisma.scheduleLog.findMany({
    where: { scheduleId },
    orderBy: { startedAt: 'desc' },
  });
  return rows.map(serializeScheduleLog);
}
