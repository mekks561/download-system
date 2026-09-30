import { api } from './api';

/**
 * AI 代理调用助手：
 * - 密钥只存后端，前端只调 /api/ai 下的认证端点
 * - 统一附加 Bearer token（AI 端点需要认证）
 * - 60s 超时（LLM 响应较慢，高于默认 30s）
 * - 失败返回 null，由调用方决定本地降级策略
 */

export interface AiProxyResult<T> {
  configured: boolean;
  result: T | null;
}

export async function aiPost<T>(path: string, body: unknown): Promise<AiProxyResult<T> | null> {
  try {
    const token = localStorage.getItem('token');
    const data = await api.post<AiProxyResult<T>>(path, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      timeout: 60000,
    });
    // api.ts 的响应拦截器运行时已解包为业务数据，但类型仍是 AxiosResponse，需双重断言
    return data as unknown as AiProxyResult<T>;
  } catch {
    return null;
  }
}
