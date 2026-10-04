import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeUser, serializeDownload, serializeUpload } from '../utils/serialize';
import { DUMMY_BCRYPT_HASH } from '../utils/password';
import { signGmToken, type GmPrincipal } from '../middleware/gm-auth';
import type {
  GmLogin,
  GmResetPassword,
  GmUserQuery,
  GmUserUpdate,
  GmDownloadQuery,
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
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return {
    users: rows.map(serializeUser),
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
 * 强制取消下载（MVP 仅改 DB 状态，不接入运行时下载引擎：
 * 不会真正中断进行中的 HTTP 下载/写盘进程，引擎侧状态联动属后续任务）。
 *
 * 状态机口径（S3 Task 4）：仅 pending/paused 允许取消——
 * - downloading：任务正在引擎中运行，DB 置 cancelled 会与引擎状态互相打架，
 *   本 MVP 不联动引擎，故拒绝而非制造假状态；
 * - error：失败任务的终态语义与 completed 同级，不应被「取消」覆盖；
 * - completed/cancelled：终态，重复操作无意义。
 * 上述非法前态统一 409 CONFLICT；记录不存在 → 404。
 */
export async function cancelDownload(id: number) {
  const row = await prisma.download.findUnique({ where: { id } });
  if (!row) throw new AppError('NOT_FOUND', 404, '下载记录不存在');
  if (row.status !== 'pending' && row.status !== 'paused') {
    throw new AppError(
      'CONFLICT',
      409,
      `下载任务当前为 ${row.status} 状态，仅 pending/paused 可取消`,
    );
  }
  const updated = await prisma.download.update({
    where: { id },
    data: { status: 'cancelled' },
  });
  return { download: serializeDownload(updated) };
}

// ---------------------------------------------------------------
// 上传审计（既有只读端点，保留并切换到 GM 独立鉴权）
// ---------------------------------------------------------------

export async function listAllUploads() {
  const rows = await prisma.upload.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    ...serializeUpload(r),
    username: r.user.username,
  }));
}
