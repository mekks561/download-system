import axios, { AxiosError, AxiosResponse } from 'axios';
import { z } from 'zod';
import { ApiSuccessSchema, ApiErrorSchema } from '@dm/shared';

export const api = axios.create({ baseURL: '/api', timeout: 30000 });

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
