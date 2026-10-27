import { inject } from 'vitest';

declare module 'vitest' {
  interface ProvidedContext {
    /** 由 helpers/global-setup.ts 探活后注入的数据库可用性标志 */
    dbAvailable: boolean;
    /** 由 helpers/global-setup.ts 探活后注入的 Redis 可用性标志 */
    redisAvailable: boolean;
  }
}

/**
 * 数据库是否可用（同步读取）。
 *
 * 探活在 helpers/global-setup.ts 中完成并通过 vitest 的 provide 注入，
 * 这里只做同步读取，以便在 describe.skipIf() 的收集阶段使用。
 *
 * 未配置 globalSetup（inject 未提供值）时返回 true：让测试真实执行、
 * 把问题暴露出来，而不是静默跳过造成“假绿”。
 */
export function isDatabaseAvailable(): boolean {
  try {
    return inject('dbAvailable') !== false;
  } catch {
    return true;
  }
}

/**
 * Redis 是否可用（同步读取）。依赖 Master↔Worker 消息总线的集成测试
 * （下载/上传/GM 定时任务等）用 isIntegrationReady() 判定是否执行。
 */
export function isRedisAvailable(): boolean {
  try {
    return inject('redisAvailable') !== false;
  } catch {
    return true;
  }
}

/** 集成测试的就绪条件：数据库与 Redis 同时可用，缺一时整组跳过。 */
export function isIntegrationReady(): boolean {
  return isDatabaseAvailable() && isRedisAvailable();
}
