import { create } from 'zustand';
import { OnboardingStep2Schema, OnboardingStep3Schema, type UserResponse } from '@dm/shared';
import { OnboardingApiService } from '../services/OnboardingApiService';
import {
  isMustChangePassword,
  markOnboarded,
  saveDownloadConfig,
  setMustChangePassword,
  type DownloadConfig,
} from '../services/onboardingGate';
import { useAppStore } from './useAppStore';
import type { User } from '../services/AuthService';

/**
 * S1 向导状态机（spec §3.3）
 *
 * ```
 * [first-run 检测] ─否→ [主界面]
 *        │是
 *        ▼
 *   Step1 ⇄ Step2 ⇄ Step3 ⇄ Step4 ──→ 写哨兵 ──→ /downloads
 * ```
 *
 * 故意**不做持久化**：spec §3.5 要求「用户中途关闭不写哨兵，下次启动重新进入向导，
 * 已完成的步骤不保留」。所以这里用普通 zustand store 而非 persist 中间件。
 */

export type OnboardingStep = 1 | 2 | 3 | 4;

export interface AdminForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type AdminField = keyof AdminForm;
/** 表单字段 → 中文错误信息（来自共享 schema，前端直接展示） */
export type FieldErrors = Partial<Record<AdminField, string>>;

const DEFAULT_CONFIG: DownloadConfig = {
  downloadDir: '',
  maxConcurrent: 5,
  speedLimitKBps: 0,
  sensitiveKeywords: [],
  autoCleanupDays: 7,
};

const EMPTY_ADMIN: AdminForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

interface OnboardingState {
  step: OnboardingStep;
  admin: AdminForm;
  config: DownloadConfig;
  fieldErrors: FieldErrors;
  submitting: boolean;
  /** 跳过向导时后端一次性回传的明文口令（仅内存持有，不落盘） */
  generatedPassword: string | null;
  /** 全局错误（网络/409 等），与字段级 fieldErrors 分开 */
  error: string | null;
  /** 管理员账号是否已创建（Step4 的清单项） */
  adminCreated: boolean;
  finished: boolean;
  /** 是否仍在使用自动生成的初始口令（顶部提示条据此显示，改密成功后置 false） */
  mustChangePassword: boolean;

  goTo: (step: OnboardingStep) => void;
  next: () => void;
  back: () => void;
  setAdminField: (field: AdminField, value: string) => void;
  setConfigField: <K extends keyof DownloadConfig>(field: K, value: DownloadConfig[K]) => void;
  setMustChangePasswordFlag: (required: boolean) => void;
  validateAdmin: () => boolean;
  submitAdmin: () => Promise<boolean>;
  submitSkip: () => Promise<boolean>;
  persistConfig: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => void;
}

/** 把后端返回的用户写进全局登录态（token 独立存 localStorage，与 AuthService 一致） */
function applySession(token: string, user: UserResponse): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', token);
  }
  const appUser: User = {
    id: String(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
  };
  useAppStore.getState().login(appUser);
}

/** 表单值 → 共享 schema 的字段级错误（中文信息直接来自 schema） */
function collectStep2Errors(admin: AdminForm): FieldErrors {
  const candidate = {
    username: admin.username,
    email: admin.email,
    password: admin.password,
  };
  const parsed = OnboardingStep2Schema.safeParse(candidate);
  const errors: FieldErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as AdminField | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }

  // 两次密码一致是纯 UI 约束，不进共享契约（后端只收一个 password 字段）
  if (!errors.password && admin.password !== admin.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致';
  }

  return errors;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  step: 1,
  admin: { ...EMPTY_ADMIN },
  config: { ...DEFAULT_CONFIG },
  fieldErrors: {},
  submitting: false,
  generatedPassword: null,
  error: null,
  adminCreated: false,
  finished: false,
  mustChangePassword: isMustChangePassword(),

  goTo: (step) => set({ step, error: null }),

  next: () => {
    const { step } = get();
    if (step < 4) set({ step: (step + 1) as OnboardingStep, error: null });
  },

  back: () => {
    const { step } = get();
    if (step > 1) set({ step: (step - 1) as OnboardingStep, error: null });
  },

  setAdminField: (field, value) =>
    set((state) => ({
      admin: { ...state.admin, [field]: value },
      // 只清掉该字段的旧错误，其余字段的提示保持不变
      fieldErrors: { ...state.fieldErrors, [field]: undefined },
      error: null,
    })),

  setConfigField: (field, value) =>
    set((state) => ({ config: { ...state.config, [field]: value } })),

  /**
   * 强制改密标记：localStorage 持久化交给 gate，store 内保留一份供界面订阅。
   * 这样提示条不需要在 effect 里同步 setState（会被 @eslint-react 判为多余渲染）。
   */
  setMustChangePasswordFlag: (required) => {
    setMustChangePassword(required);
    set({ mustChangePassword: required });
  },

  validateAdmin: () => {
    const errors = collectStep2Errors(get().admin);
    set({ fieldErrors: errors });
    return Object.keys(errors).length === 0;
  },

  submitAdmin: async () => {
    if (!get().validateAdmin()) return false;

    set({ submitting: true, error: null });
    try {
      const { username, email, password } = get().admin;
      const result = await OnboardingApiService.setup({ username, email, password });
      applySession(result.token, result.user);
      set({ submitting: false, adminCreated: true, step: 3 });
      return true;
    } catch (err) {
      set({ submitting: false, error: err instanceof Error ? err.message : '创建管理员失败' });
      return false;
    }
  },

  submitSkip: async () => {
    set({ submitting: true, error: null });
    try {
      const result = await OnboardingApiService.skipSetup();
      applySession(result.token, result.user);
      get().setMustChangePasswordFlag(result.mustChangePassword);
      await markOnboarded();
      set({ submitting: false, generatedPassword: result.generatedPassword, finished: true });
      return true;
    } catch (err) {
      set({ submitting: false, error: err instanceof Error ? err.message : '跳过向导失败' });
      return false;
    }
  },

  persistConfig: async () => {
    const { config } = get();
    // 保存前用与后端同一份 Step3 契约校验：coerce 兼容表单字符串，
    // 目录空白 / 并发数越界（如 99）/ 限速为负 / NaN 都在此拦截，不落本地配置。
    const parsed = OnboardingStep3Schema.safeParse({
      downloadDir: config.downloadDir.trim(),
      maxConcurrent: config.maxConcurrent,
      speedLimitKBps: config.speedLimitKBps,
      sensitiveKeywords: config.sensitiveKeywords,
      autoCleanupDays: config.autoCleanupDays,
    });
    if (!parsed.success) {
      set({ error: parsed.error.issues[0]?.message ?? '下载配置不合法，请检查后重试' });
      return;
    }
    try {
      // 返回值可能是服务端归一化后的路径（相对 → 绝对），回写 store 供 Step4 清单展示
      const persisted = await saveDownloadConfig({
        downloadDir: parsed.data.downloadDir,
        maxConcurrent: parsed.data.maxConcurrent,
        speedLimitKBps: parsed.data.speedLimitKBps,
        sensitiveKeywords: parsed.data.sensitiveKeywords,
        autoCleanupDays: parsed.data.autoCleanupDays,
      });
      set({ error: null, config: persisted, step: 4 });
    } catch (err) {
      // 服务端明确拒绝（如目录不可写/越界）时停在本步并展示中文原因
      set({ error: err instanceof Error ? err.message : '保存下载配置失败' });
    }
  },

  complete: async () => {
    await markOnboarded();
    set({ finished: true });
  },

  reset: () =>
    set({
      step: 1,
      admin: { ...EMPTY_ADMIN },
      config: { ...DEFAULT_CONFIG },
      fieldErrors: {},
      submitting: false,
      generatedPassword: null,
      error: null,
      adminCreated: false,
      finished: false,
      mustChangePassword: isMustChangePassword(),
    }),
}));

/** 密码强度（0-4），供 Step2 的强度条使用 */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export const PASSWORD_STRENGTH_LABELS = ['太短', '弱', '一般', '强', '很强'] as const;
