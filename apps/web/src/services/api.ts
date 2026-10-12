import axios, { AxiosError, AxiosResponse } from 'axios';
import { z } from 'zod';
import { ApiSuccessSchema, ApiErrorSchema } from '@dm/shared';

export const api = axios.create({ baseURL: '/api', timeout: 30000 });

// 请求拦截器：有令牌就带上（与 ApiClient 同一套约定——主站 token 存 localStorage，
// 走 Authorization: Bearer）。没有令牌时不加头，公开端点（health / setup-status 等）
// 因此不受影响；鉴权端点则统一由后端按 401 拒绝，不需要各 service 自己拼头。
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    const parsed = ApiSuccessSchema(z.unknown()).safeParse(res.data);
    if (!parsed.success) return Promise.reject(new Error('响应格式不符契约'));
    // 拦截器自动解包 data，service 层拿到的就是业务数据
    return parsed.data.data as AxiosResponse;
  },
  (err: unknown) => {
    const axiosErr = err as AxiosError;
    const parsed = ApiErrorSchema.safeParse(axiosErr.response?.data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      return Promise.reject(Object.assign(new Error(message), { code, details }));
    }
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  },
);

/**
 * 是否为「后端按契约拒绝」的业务错误（interceptor 会把后端 error.code 附上去）。
 *
 * 刻意排除 AxiosError：网络不通/超时同样带字符串 code（如 'ERR_NETWORK'），
 * 但语义上要区分开——业务拒绝要展示给用户，网络故障则允许调用方走离线兜底。
 */
export function isApiError(err: unknown): err is Error & { code: string; details?: unknown } {
  return (
    err instanceof Error &&
    typeof (err as { code?: unknown }).code === 'string' &&
    !axios.isAxiosError(err)
  );
}
