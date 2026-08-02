import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeSchedule, serializeScheduleLog } from '../utils/serialize';
import type { ScheduleCreate } from '@dm/shared';

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
  return serializeSchedule(row);
}

export async function updateSchedule(
  id: number,
  userId: number,
  data: { isEnabled?: boolean; cron?: string },
) {
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '调度不存在');
  const row = await prisma.schedule.update({
    where: { id },
    data,
  });
  return serializeSchedule(row);
}

export async function deleteSchedule(id: number, userId: number) {
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '调度不存在');
  await prisma.schedule.delete({ where: { id } });
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
