import { api } from './api';
import type {
  OnboardingSetupResult,
  OnboardingSkipResult,
  OnboardingStatus,
  OnboardingStep2Input,
} from '@dm/shared';

/**
 * S1 首次运行向导的数据访问层。
 *
 * 走 `services/api.ts` 这个带契约校验的 axios 实例：它会把 `{ success, data, timestamp }`
 * 信封解开，并在失败时抛出后端返回的 `error.message`（中文、可直接展示给用户），
 * 而不是 axios 默认那句 "Request failed with status code 400"。
 *
 * `api` 的响应拦截器在运行时已解包为业务数据，但静态类型仍是 AxiosResponse，
 * 故此处沿用 aiProxy.ts 的双重断言写法。
 */
export const OnboardingApiService = {
  /** 是否处于「未初始化」状态（后端 users 表为空） */
  async getStatus(): Promise<OnboardingStatus> {
    const data = await api.get<OnboardingStatus>('/auth/setup-status');
    return data as unknown as OnboardingStatus;
  },

  /** 首次运行创建管理员（仅 users 表为空时可用） */
  async setup(input: OnboardingStep2Input): Promise<OnboardingSetupResult> {
    const data = await api.post<OnboardingSetupResult>('/auth/setup', input);
    return data as unknown as OnboardingSetupResult;
  },

  /** 跳过向导：后端生成随机强口令，明文只回传这一次 */
  async skipSetup(): Promise<OnboardingSkipResult> {
    const data = await api.post<OnboardingSkipResult>('/auth/skip-setup', {});
    return data as unknown as OnboardingSkipResult;
  },

  /** Step 4 完成页的健康检查项（数据库可用性由后端 /health 反映） */
  async isBackendHealthy(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch {
      return false;
    }
  },
};
