import { Prisma } from '@prisma/client';
import { AppError } from './errors';

/**
 * Prisma 唯一约束冲突（P2002）→ 面向用户的精确提示。
 *
 * 为什么需要单独抽出来：全局错误中间件原先一律回「唯一约束冲突」，
 * 用户在注册页看到这句话既不知道是用户名还是邮箱被占用，也拿不到下一步动作
 * （去登录 / 换个名字），只能反复重试——MySQL 的失败插入同样推进 AUTO_INCREMENT，
 * 重试还会白白消耗自增 ID。
 *
 * `meta.target` 的形态随连接器而异：MySQL 给的是**索引名字符串**
 * （本项目实测 `users_email_key` / `users_username_key`），PostgreSQL 通常是字段名数组。
 * 故这里对两种形态统一按子串判断，判断不出来再退化到调用方给的兜底文案。
 *
 * @param target   P2002 错误的 `meta.target`
 * @param fallback 无法从 target 识别字段时的兜底文案（调用方按业务语境给）
 */
/**
 * 把 `meta.target` 归一成可做子串匹配的小写文本。
 *
 * 只接受字符串与字符串数组两种已知形态；其余（undefined / 意外对象）一律当空串，
 * 落到调用方的兜底文案——避免 `String(obj)` 产生 '[object Object]' 这种无意义匹配。
 */
function normalizeTarget(target: unknown): string {
  if (typeof target === 'string') return target.toLowerCase();
  if (Array.isArray(target)) {
    return target.filter((x): x is string => typeof x === 'string').join(',').toLowerCase();
  }
  return '';
}

export function uniqueConflictMessage(
  target: unknown,
  fallback = '该记录已存在，请勿重复提交',
): string {
  const raw = normalizeTarget(target);
  if (raw.includes('email')) return '该邮箱已被注册，请直接登录或更换邮箱';
  if (raw.includes('username')) return '该用户名已被占用，请更换用户名';
  return fallback;
}

/** 判定是否为 Prisma 唯一约束冲突（P2002） */
export function isUniqueConflict(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * 唯一冲突归一为 409 + 精确提示；其余错误原样抛出交由全局错误中间件处理。
 *
 * 用法：包在 `prisma.*.create/update` 外层，作为「预检查通过但插入时被并发抢占」的兜底。
 */
export function rethrowUniqueConflict(err: unknown, fallback?: string): never {
  if (isUniqueConflict(err)) {
    throw new AppError('CONFLICT', 409, uniqueConflictMessage(err.meta?.target, fallback));
  }
  throw err;
}
