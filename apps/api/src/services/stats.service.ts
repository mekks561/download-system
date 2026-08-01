import { prisma } from '../config/prisma';
import { serializeActivity } from '../utils/serialize';

export async function getOverview(userId: number) {
  const [downloadCount, completedDownloads, activeDownloads, uploadCount, fileAgg] =
    await Promise.all([
      prisma.download.count({ where: { userId } }),
      prisma.download.count({ where: { userId, status: 'completed' } }),
      prisma.download.count({ where: { userId, status: 'downloading' } }),
      prisma.upload.count({ where: { userId } }),
      prisma.file.aggregate({ where: { userId }, _sum: { size: true } }),
    ]);
  return {
    downloadCount,
    completedDownloads,
    activeDownloads,
    uploadCount,
    totalFileSize: Number(fileAgg._sum.size ?? 0),
  };
}

export async function getActivities(userId: number, limit = 20) {
  const rows = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(serializeActivity);
}

export async function getTrend(userId: number, days = 7) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const rows = await prisma.download.findMany({
    where: { userId, createdAt: { gte: startDate } },
    select: { createdAt: true },
  });

  const map = new Map<string, { date: string; count: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map.set(key, { date: key, count: 0 });
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().split('T')[0];
    const entry = map.get(key);
    if (entry) entry.count += 1;
  }

  return Array.from(map.values());
}
