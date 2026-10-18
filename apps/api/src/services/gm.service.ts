import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { pluginHost } from '../config/plugin-host';
import { taskObserver } from './task-observer.service';
import * as engine from './download-engine.service';
import * as torrentEngine from './torrent-engine.service';
import * as resource from './resource.service';
import * as ai from './ai.service';
import { getSettings, updateSettings as updateGlobalSettings } from './settings.service';
import { serializeUser, serializeDownload, serializeUpload } from '../utils/serialize';
import { DUMMY_BCRYPT_HASH } from '../utils/password';
import { signGmToken, type GmPrincipal } from '../middleware/gm-auth';
import type {
  GmLogin,
  GmResetPassword,
  GmUserQuery,
  GmUserUpdate,
  GmDownloadQuery,
  GmUploadQuery,
  GmActivityQuery,
} from '@dm/shared';

// ---------------------------------------------------------------
// 认证（独立 gm_users + 独立 GM JWT）
// ---------------------------------------------------------------

/** GM 登录：用户名不存在与密码错误统一 INVALID_CREDENTIALS，不泄露账号存在性 */
export async function login(input: GmLogin) {
  const gmUser = await prisma.gmUser.findUnique({ where: { username: input.username } });
  // 常量时间失败：用户名不存在也对 dummy hash 完整跑一次 bcrypt.compare，
  // 与密码错误路径等时，防响应耗时侧信枚举 gm_users 账号
  const ok = await bcrypt.compare(input.password, gmUser?.password ?? DUMMY_BCRYPT_HASH);
  if (!gmUser || !ok) {
    throw new AppError('INVALID_CREDENTIALS', 401, '用户名或密码错误');
  }
  const principal: GmPrincipal = { id: gmUser.id, username: gmUser.username, role: gmUser.role };
  return {
    token: signGmToken(principal),
    gmUser: { id: gmUser.id, username: gmUser.username, role: gmUser.role },
  };
}

// ---------------------------------------------------------------
// 仪表盘
// ---------------------------------------------------------------

/** 全局计数 + 最近 7 天每日下载数（含今天，UTC 日期桶，与 stats.service 同一手法） */
export async function getDashboardStats() {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  const [userCount, downloadCount, uploadCount, fileCount, recentRows] = await Promise.all([
    prisma.user.count(),
    prisma.download.count(),
    prisma.upload.count(),
    prisma.file.count(),
    prisma.download.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
  ]);

  const buckets = new Map<string, { date: string; downloads: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split('T')[0];
    buckets.set(key, { date: key, downloads: 0 });
  }
  for (const row of recentRows) {
    const key = row.createdAt.toISOString().split('T')[0];
    const entry = buckets.get(key);
    if (entry) entry.downloads += 1;
  }

  return {
    userCount,
    downloadCount,
    uploadCount,
    fileCount,
    dailyDownloads: Array.from(buckets.values()),
  };
}

/** 
 * 获取小时级历史下载流量统计 (最近 72 小时)
 * 用于 AI 流量预测
 */
export async function getHourlyTrafficStats() {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 71); // 过去 72 小时
  startDate.setMinutes(0, 0, 0);

  const recentDownloads = await prisma.download.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, totalBytes: true },
  });

  const buckets = new Map<string, { time: string; count: number; size: bigint }>();
  
  // 初始化 72 个小时桶
  for (let i = 0; i < 72; i++) {
    const d = new Date(startDate);
    d.setHours(d.getHours() + i);
    const key = d.toISOString().substring(0, 13); // YYYY-MM-DDTHH
    buckets.set(key, { 
      time: d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }), 
      count: 0, 
      size: 0n 
    });
  }

  for (const row of recentDownloads) {
    const key = row.createdAt.toISOString().substring(0, 13);
    const entry = buckets.get(key);
    if (entry) {
      entry.count += 1;
      entry.size += row.totalBytes;
    }
  }

  return Array.from(buckets.values()).map(b => ({
    ...b,
    size: b.size.toString()
  }));
}

// ---------------------------------------------------------------
// 资源治理
// ---------------------------------------------------------------

export async function getStorageGovernance() {
  return resource.scanStorage();
}

export async function getStorageByCategory() {
  return resource.getStorageByCategory();
}

/** 获取存储占用趋势 (最近 7 次快照) */
export async function getStorageTrends() {
  const stats = await prisma.storageStats.findMany({
    orderBy: { createdAt: 'desc' },
    take: 7
  });

  return stats.reverse().map(s => ({
    date: s.createdAt.toISOString().split('T')[0],
    time: s.createdAt.toLocaleTimeString(),
    total: Number(s.totalBytes / 1024n / 1024n),
    downloads: Number(s.downloadDir / 1024n / 1024n),
    uploads: Number(s.uploadDir / 1024n / 1024n)
  }));
}

/** 获取 AI 驱动的治理洞察 */
export async function getAiGovernanceInsights() {
  const [gov, suspiciousItems, duplicates, profiles] = await Promise.all([
    resource.scanStorage(),
    prisma.download.findMany({
      where: { 
        OR: [
          { status: 'error' },
          { totalBytes: { gt: 1024 * 1024 * 1024 } }, // > 1GB
        ]
      },
      select: { originalName: true, status: true, totalBytes: true, metadata: true },
      take: 20,
    }),
    resource.detectDuplicates(),
    resource.getUserBehaviorProfile()
  ]);

  const baseInsights = await ai.generateGovernanceInsights(
    gov.stats,
    gov.topUsage,
    suspiciousItems.map(i => ({
      name: i.originalName,
      status: i.status,
      size: i.totalBytes.toString(),
      aiInfo: i.metadata
    }))
  );

  const insights: ai.GovernanceInsight[] = baseInsights || [];

  // 添加去重建议
  if (duplicates.length > 0) {
    const totalPotentialSavings = duplicates.reduce((acc, d) => {
      return acc + d.matches.reduce((innerAcc, m) => innerAcc + BigInt(d.original.size), 0n);
    }, 0n);

    insights.push({
      type: 'cleanup',
      title: '发现重复资源',
      description: `系统检测到 ${duplicates.length} 组疑似重复的文件，清理后预计可释放 ${(Number(totalPotentialSavings) / 1024 / 1024).toFixed(2)} MB 空间。`,
      action: 'cleanup:duplicates'
    });
  }

  // 添加配额调整建议
  const quotaIncreaseNeeded = profiles.filter(p => p.recommendation === 'increase');
  if (quotaIncreaseNeeded.length > 0) {
    insights.push({
      type: 'optimization',
      title: '用户配额预警',
      description: `有 ${quotaIncreaseNeeded.length} 位活跃用户的存储空间即将耗尽，建议根据画像调优其配额。`,
      action: 'quota:auto_adjust'
    });
  }

  return insights;
}

/** 执行 AI 建议的治理操作 */
export async function applyAiGovernanceAction(action: string) {
  console.log(`[GM] Applying AI action: ${action}`);
  
  if (action.startsWith('cleanup:large_files')) {
    // 示例：清理超过 5GB 且 30 天未访问的错误任务
    const result = await prisma.download.deleteMany({
      where: {
        status: 'error',
        totalBytes: { gt: 5n * 1024n * 1024n * 1024n },
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });
    return { success: true, affected: result.count };
  }
  
  if (action.startsWith('cleanup:zombie_parts')) {
    const result = await resource.cleanupExpiredResources(0); // 仅清理 .part
    return { success: true, affected: result.zombieParts.length };
  }

  if (action.startsWith('cleanup:suspicious')) {
    // 清理 AI 标记为 suspicious 或包含敏感词的错误任务
    // MariaDB 不支持 Prisma 的 Json path 数组过滤，先查出候选 ID 再按 ID 批量删除
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.download.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, status: true, metadata: true }
    });
    const ids = candidates
      .filter(
        d =>
          d.status === 'error' ||
          (d.metadata as Record<string, unknown> | null)?.aiCategory === 'suspicious'
      )
      .map(d => d.id);
    const result = ids.length
      ? await prisma.download.deleteMany({ where: { id: { in: ids } } })
      : { count: 0 };
    return { success: true, affected: result.count };
  }

  if (action.startsWith('quota:soft_limit')) {
    // 自动为超额用户开启软限制预警
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { downloads: { where: { status: 'completed' } } }
    });
    
    let affected = 0;
    for (const user of users) {
      const usage = user.downloads.reduce((acc, d) => acc + d.totalBytes, 0n);
      if (usage > user.storageQuota) {
        // TODO: 发送系统通知或邮件
        console.log(`[AI Quota] 用户 ${user.username} 已超配额: ${usage} > ${user.storageQuota}`);
        affected++;
      }
    }
    return { success: true, affected };
  }

  if (action.startsWith('cleanup:duplicates')) {
    const parts = action.split(':');
    const targetId = parts.length > 2 ? parseInt(parts[2]) : null;
    
    const duplicates = await resource.detectDuplicates();
    let affected = 0;
    for (const group of duplicates) {
      for (const match of group.matches) {
        if (targetId && match.id !== targetId) continue;
        
        // 调用物理清理
        await engine.purgeArtifacts(match.id);
        await prisma.download.delete({ where: { id: match.id } });
        affected++;
      }
    }
    return { success: true, affected };
  }

  if (action.startsWith('quota:auto_adjust')) {
    const parts = action.split(':');
    const targetUserId = parts.length > 2 ? parseInt(parts[2]) : null;

    const profiles = await resource.getUserBehaviorProfile();
    let affected = 0;
    for (const profile of profiles) {
      if (targetUserId && profile.userId !== targetUserId) continue;

      if (profile.recommendation === 'increase') {
        const newQuota = BigInt(profile.currentQuota) * 15n / 10n; // 增加 50%
        await prisma.user.update({
          where: { id: profile.userId },
          data: { storageQuota: newQuota }
        });
        affected++;
      } else if (profile.recommendation === 'decrease') {
        const newQuota = BigInt(profile.currentQuota) * 8n / 10n; // 减少 20%
        await prisma.user.update({
          where: { id: profile.userId },
          data: { storageQuota: newQuota }
        });
        affected++;
      }
    }
    return { success: true, affected };
  }

  throw new AppError('INVALID_ACTION', 400, `不支持的操作: ${action}`);
}

export async function getCleanupPreview(days: number) {
  return resource.getCleanupPreview(days);
}

export async function triggerCleanup(days: number) {
  return resource.cleanupExpiredResources(days);
}

// ---------------------------------------------------------------
// 用户管理
// ---------------------------------------------------------------

function buildUserWhere(q: GmUserQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (q.search) {
    where.OR = [
      { email: { contains: q.search } },
      { username: { contains: q.search } },
    ];
  }
  if (q.role) where.role = q.role;
  return where;
}

export async function listUsers(q: GmUserQuery) {
  const where = buildUserWhere(q);
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        _count: {
          select: { downloads: true }
        },
        downloads: {
          where: { status: { in: ['completed', 'downloading', 'paused'] } },
          select: { totalBytes: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return {
    users: rows.map((u) => {
      const usage = u.downloads.reduce((acc, d) => acc + d.totalBytes, 0n);
      return {
        ...serializeUser(u),
        storageQuota: u.storageQuota.toString(),
        currentUsage: usage.toString(),
        downloadCount: u._count.downloads,
      };
    }),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/**
 * 更新主站用户（role/isActive 白名单由 zod strict schema + 此处显式取字段双重保证）。
 *
 * GM 自我保护：B-lite 下 GM 账号（gm_users）与主站账号（users）分表，
 * 以「同名 username」标识当前 GM 关联的主站管理员，禁止把其降级或禁用，
 * 防止 GM 操作后系统失去可登录的主站管理员（返回 400）。
 */
export async function updateUser(id: number, input: GmUserUpdate, actor: GmPrincipal) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');

  if (
    user.username === actor.username &&
    (input.role === 'user' || input.isActive === false)
  ) {
    throw new AppError(
      'GM_SELF_PROTECTION',
      400,
      '不能降级或禁用当前 GM 关联的管理员账号',
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: input.role ?? undefined,
      isActive: input.isActive ?? undefined,
      storageQuota: input.storageQuota !== undefined ? BigInt(input.storageQuota) : undefined,
    },
  });
  return { user: serializeUser(updated) };
}

/** GM 重置主站用户密码；不返回任何敏感信息（data=null） */
export async function resetUserPassword(id: number, input: GmResetPassword) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', 404, '用户不存在');
  const hash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({ where: { id }, data: { password: hash } });
  return null;
}

// ---------------------------------------------------------------
// 下载审计
// ---------------------------------------------------------------

export async function listDownloads(q: GmDownloadQuery) {
  const where: Prisma.DownloadWhereInput = q.userId ? { userId: q.userId } : {};
  const [total, rows] = await Promise.all([
    prisma.download.count({ where }),
    prisma.download.findMany({
      where,
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return {
    downloads: rows.map((r) => ({
      ...serializeDownload(r),
      username: r.user.username,
      email: r.user.email,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/**
 * 强制取消下载。
 *
 * 联动运行时下载引擎（S3 Task 4 补全）：如果任务正在运行（downloading），
 * 调用引擎的 forceCancel 中断 HTTP 拉流并清理 .part 文件。
 *
 * 状态机口径：
 * - downloading: 调用引擎中断并清理；
 * - pending/paused: 调用引擎清理文件并改状态；
 * - error/completed/cancelled: 终态，拒绝操作 (409)。
 */
export async function cancelDownload(id: number) {
  const row = await prisma.download.findUnique({ where: { id } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');

  if (row.status === 'completed' || row.status === 'cancelled' || row.status === 'error') {
    throw new AppError(
      'CONFLICT',
      409,
      `下载任务当前为 ${row.status} 状态，无法取消`,
    );
  }

  await engine.forceCancel(id);

  const updated = await prisma.download.findUnique({ where: { id } });
  return { download: serializeDownload(updated!) };
}

// ---------------------------------------------------------------
// 上传审计
// ---------------------------------------------------------------

export async function listUploads(q: GmUploadQuery) {
  const where: Prisma.UploadWhereInput = q.userId ? { userId: q.userId } : {};
  const [total, rows] = await Promise.all([
    prisma.upload.count({ where }),
    prisma.upload.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return {
    uploads: rows.map((r) => ({
      ...serializeUpload(r),
      username: r.user.username,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/** 活动审计列表 */
export async function listActivities(q: GmActivityQuery) {
  const where: Prisma.ActivityWhereInput = q.userId ? { userId: q.userId } : {};
  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return {
    activities: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      username: r.user.username,
      type: r.type,
      details: r.details,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/** 获取实时系统日志 */
export async function getSystemLogs() {
  return taskObserver.getLogs();
}

/** GM 强制删除上传记录（物理删除文件 + DB 记录） */
export async function deleteUpload(id: number) {
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) throw new AppError('NOT_FOUND', 404, '上传记录不存在');

  // 物理删除文件
  if (upload.filePath) {
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(upload.filePath);
    } catch (err) {
      console.warn(`[GM] 物理删除上传文件失败 (${upload.filePath}):`, err);
    }
  }

  await prisma.upload.delete({ where: { id } });
}

// ---------------------------------------------------------------
// 系统设置
// ---------------------------------------------------------------

/** 列出所有系统设置 */
export async function listAppSettings() {
  const rows = await prisma.appSetting.findMany();
  return rows.map((r) => ({
    key: r.key,
    value: JSON.parse(r.value),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** 更新系统设置 */
export async function updateAppSetting(key: string, value: unknown) {
  const row = await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });

  // 如果更新的是下载配置，联动更新 BT 引擎的运行时限速
  if (key === 'download.config') {
    void torrentEngine.applyGlobalSpeedLimit();
  }

  return {
    key: row.key,
    value: JSON.parse(row.value),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------
// 插件管理
// ---------------------------------------------------------------

/** 列出所有插件（含状态与元数据） */
export async function listPlugins() {
  return pluginHost.listAll();
}

/** 启用/禁用插件 */
export async function togglePlugin(id: string, enabled: boolean) {
  await pluginHost.toggle(id, enabled);
}

/** 卸载插件（物理删除目录 + 移除配置） */
export async function uninstallPlugin(id: string) {
  await pluginHost.uninstall(id);
}

/** 上传并安装插件 */
export async function uploadPlugin(zipPath: string) {
  const id = await pluginHost.install(zipPath);
  return { id };
}
