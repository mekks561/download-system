import { randomInt } from 'node:crypto';

/**
 * 生成一次性强密码（用于「跳过向导」场景）
 *
 * 为什么不用固定口令：v3.1.0 已移除 seed 里的硬编码弱口令并加了回归测试锁死，
 * 跳过向导若再写死 `Admin@123` 相当于把弱口令重新放回仓库。改为每次随机生成、
 * 明文只回传一次，且强制用户首次登录后修改。
 *
 * 字符集刻意剔除易混淆字符（I/l/0/O/1），避免用户手抄时认错。
 */
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*-_=+';
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

function pick(charset: string): string {
  // randomInt 走 CSPRNG，且不存在取模偏差
  return charset[randomInt(0, charset.length)];
}

export function generateStrongPassword(length = 16): string {
  if (length < 8) {
    throw new Error('密码长度至少 8 位');
  }

  // 先各取一位保证四类字符都出现（后端 OnboardingStep2Schema 只管长度，
  // 但强密码策略要让生成结果自身达标）
  const chars: string[] = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < length) {
    chars.push(pick(ALL));
  }

  // Fisher–Yates 洗牌：否则前四位恒为「大写+小写+数字+符号」，模式可被预测
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}
