import { prisma } from '../config/prisma';

// --------------------------------------------------
// 类型定义：与前端 StatsDashboard 契约对齐
// --------------------------------------------------

export type TimeRange = 'today' | 'week' | 'month';

interface OverviewStat {
  downloads: { total: number; completed: number; totalBytes: number; completionRate: number };
  uploads: { total: number; completed: number; totalBytes: number; completionRate: number };
  shares: { total: number };
  storage: { used: number; total: number };
}

interface TrendPoint {
  date: string;
  downloads: number;
  uploads: number;
}

interface FileTypeStat {
  type: string;
  name: string;
  count: number;
  totalSize: number;
  color: string;
}

interface ActivityStat {
  id: number;
  type: 'download' | 'upload';
  filename: string;
  status: string;
  createdAt: string;
  size: number;
}

// --------------------------------------------------
// 常量配置
// --------------------------------------------------

// 存储配额（默认 10GB，可通过环境变量覆盖）
const STORAGE_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES ?? 10 * 1024 * 1024 * 1024);

// 文件类型展示映射：按 MIME 大类聚合
const FILE_TYPE_META: Record<string, { name: string; color: string }> = {
  image: { name: '图片', color: '#ec4899' },
  video: { name: '视频', color: '#8b5cf6' },
  audio: { name: '音频', color: '#f59e0b' },
  application: { name: '应用', color: '#10b981' },
  text: { name: '文本', color: '#3b82f6' },
  font: { name: '字体', color: '#6366f1' },
  other: { name: '其他', color: '#9ca3af' },
};

// 将 MIME 类型归类为大类并返回展示信息
function getFileTypeMeta(mimeType: string): { type: string; name: string; color: string } {
  const major = (mimeType || '').split('/')[0]?.toLowerCase() ?? 'other';
  const meta = FILE_TYPE_META[major] ?? FILE_TYPE_META.other;
  return { type: major, ...meta };
}

// 将语义时间范围转换为天数
function rangeToDays(range: TimeRange): number {
  switch (range) {
    case 'today':
      return 1;
    case 'month':
      return 30;
    case 'week':
    default:
      return 7;
  }
}

// --------------------------------------------------
// 概览统计：返回嵌套结构供前端直接消费
// --------------------------------------------------

export async function getOverview(userId: number): Promise<OverviewStat> {
  const [
    downloadCount,
    completedDownloads,
    uploadCount,
    completedUploads,
    downloadAgg,
    uploadAgg,
    shareCount,
    fileAgg,
  ] = await Promise.all([
    prisma.download.count({ where: { userId } }),
    prisma.download.count({ where: { userId, status: 'completed' } }),
    prisma.upload.count({ where: { userId } }),
    prisma.upload.count({ where: { userId, status: 'completed' } }),
    prisma.download.aggregate({ where: { userId }, _sum: { totalBytes: true } }),
    prisma.upload.aggregate({ where: { userId }, _sum: { totalBytes: true } }),
    prisma.share.count({ where: { userId } }),
    prisma.file.aggregate({ where: { userId }, _sum: { size: true } }),
  ]);

  const downloadTotalBytes = Number(downloadAgg._sum.totalBytes ?? 0);
  const uploadTotalBytes = Number(uploadAgg._sum.totalBytes ?? 0);
  const usedStorage = Number(fileAgg._sum.size ?? 0);

  return {
    downloads: {
      total: downloadCount,
      completed: completedDownloads,
      totalBytes: downloadTotalBytes,
      completionRate: downloadCount === 0 ? 0 : (completedDownloads / downloadCount) * 100,
    },
    uploads: {
      total: uploadCount,
      completed: completedUploads,
      totalBytes: uploadTotalBytes,
      completionRate: uploadCount === 0 ? 0 : (completedUploads / uploadCount) * 100,
    },
    shares: { total: shareCount },
    storage: { used: usedStorage, total: STORAGE_QUOTA_BYTES },
  };
}

// --------------------------------------------------
// 趋势统计：按天聚合下载与上传数量
// --------------------------------------------------

export async function getTrend(userId: number, range: TimeRange = 'week'): Promise<TrendPoint[]> {
  const days = rangeToDays(range);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const [downloadRows, uploadRows] = await Promise.all([
    prisma.download.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.upload.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
  ]);

  // 初始化日期桶
  const map = new Map<string, TrendPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    map.set(key, { date: key, downloads: 0, uploads: 0 });
  }

  // 累计下载
  for (const row of downloadRows) {
    const key = row.createdAt.toISOString().split('T')[0];
    const entry = map.get(key);
    if (entry) entry.downloads += 1;
  }

  // 累计上传
  for (const row of uploadRows) {
    const key = row.createdAt.toISOString().split('T')[0];
    const entry = map.get(key);
    if (entry) entry.uploads += 1;
  }

  return Array.from(map.values());
}

// --------------------------------------------------
// 文件类型分布：按 MIME 大类聚合文件数与总大小
// --------------------------------------------------

export async function getFileTypes(userId: number): Promise<FileTypeStat[]> {
  const rows = await prisma.file.findMany({
    where: { userId, isDirectory: false },
    select: { type: true, size: true },
  });

  const map = new Map<string, FileTypeStat>();
  for (const row of rows) {
    const meta = getFileTypeMeta(row.type);
    const existing = map.get(meta.type);
    if (existing) {
      existing.count += 1;
      existing.totalSize += Number(row.size);
    } else {
      map.set(meta.type, {
        type: meta.type,
        name: meta.name,
        color: meta.color,
        count: 1,
        totalSize: Number(row.size),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// --------------------------------------------------
// 最近活动：将 Activity 记录映射为前端期望的结构
// --------------------------------------------------

export async function getActivities(userId: number, limit = 20): Promise<ActivityStat[]> {
  const rows = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const type: 'download' | 'upload' = r.type === 'upload' ? 'upload' : 'download';
    return {
      id: r.id,
      type,
      filename: (meta.filename as string) ?? r.description,
      status: (meta.status as string) ?? 'completed',
      createdAt: r.createdAt.toISOString(),
      size: Number(meta.size ?? 0),
    };
  });
}
