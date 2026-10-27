import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOnboardingStore } from '../useOnboardingStore';
import { useAppStore } from '../useAppStore';
import { isMustChangePassword, resetOnboardingLocalState } from '../../services/onboardingGate';

vi.mock('../../services/OnboardingApiService', () => ({
  OnboardingApiService: {
    getStatus: vi.fn(),
    setup: vi.fn(),
    skipSetup: vi.fn(),
    isBackendHealthy: vi.fn(),
  },
}));

import { OnboardingApiService } from '../../services/OnboardingApiService';

const mocked = OnboardingApiService as unknown as {
  setup: ReturnType<typeof vi.fn>;
  skipSetup: ReturnType<typeof vi.fn>;
};

const validUser = {
  id: 7,
  username: 'admin01',
  email: 'admin@dm.local',
  role: 'admin' as const,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
};

describe('useOnboardingStore · 表单校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
    useAppStore.setState({ user: null, isAuthenticated: false });
  });

  it('初始停留在 Step 1，且不持久化任何步骤（关闭后重来）', () => {
    expect(useOnboardingStore.getState().step).toBe(1);
    expect(localStorage.getItem('dm_onboarding_step')).toBeNull();
  });

  it('合法输入通过校验', () => {
    const store = useOnboardingStore.getState();
    useOnboardingStore.setState({
      admin: {
        username: 'admin01',
        email: 'admin@dm.local',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      },
    });
    expect(store.validateAdmin()).toBe(true);
    expect(useOnboardingStore.getState().fieldErrors).toEqual({});
  });

  it('用户名过短时报出 schema 里的中文提示', () => {
    useOnboardingStore.setState({
      admin: { username: 'ab', email: 'a@b.com', password: 'StrongPass123', confirmPassword: 'StrongPass123' },
    });
    useOnboardingStore.getState().validateAdmin();

    expect(useOnboardingStore.getState().fieldErrors.username).toContain('用户名');
  });

  it('邮箱非法时报错', () => {
    useOnboardingStore.setState({
      admin: { username: 'admin01', email: 'bad', password: 'StrongPass123', confirmPassword: 'StrongPass123' },
    });
    useOnboardingStore.getState().validateAdmin();

    expect(useOnboardingStore.getState().fieldErrors.email).toContain('邮箱');
  });

  it('两次密码不一致时报错（纯 UI 约束）', () => {
    useOnboardingStore.setState({
      admin: { username: 'admin01', email: 'a@b.com', password: 'StrongPass123', confirmPassword: 'Other123456' },
    });
    useOnboardingStore.getState().validateAdmin();

    expect(useOnboardingStore.getState().fieldErrors.confirmPassword).toContain('不一致');
  });

  it('修改某字段只清除该字段的错误', () => {
    useOnboardingStore.setState({
      admin: { username: 'ab', email: 'bad', password: 'StrongPass123', confirmPassword: 'StrongPass123' },
    });
    useOnboardingStore.getState().validateAdmin();
    expect(Object.keys(useOnboardingStore.getState().fieldErrors).length).toBeGreaterThan(1);

    useOnboardingStore.getState().setAdminField('username', 'admin01');

    expect(useOnboardingStore.getState().fieldErrors.username).toBeUndefined();
    expect(useOnboardingStore.getState().fieldErrors.email).toBeDefined();
  });
});

describe('useOnboardingStore · 提交管理员', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
    useAppStore.setState({ user: null, isAuthenticated: false });
    // 提交管理员的真实场景是「用户已经在 Step 2」
    useOnboardingStore.setState({
      step: 2,
      admin: {
        username: 'admin01',
        email: 'admin@dm.local',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      },
    });
  });

  it('校验不过时不发请求', async () => {
    useOnboardingStore.setState({ admin: { username: 'ab', email: 'bad', password: '1', confirmPassword: '2' } });

    const ok = await useOnboardingStore.getState().submitAdmin();

    expect(ok).toBe(false);
    expect(mocked.setup).not.toHaveBeenCalled();
  });

  it('成功后写入登录态并进入 Step 3', async () => {
    mocked.setup.mockResolvedValue({ token: 'jwt-token', user: validUser });

    const ok = await useOnboardingStore.getState().submitAdmin();

    expect(ok).toBe(true);
    expect(mocked.setup).toHaveBeenCalledWith({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
    });
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    expect(useAppStore.getState().user?.id).toBe('7'); // 前端 User.id 为 string
    expect(useOnboardingStore.getState().step).toBe(3);
    expect(useOnboardingStore.getState().adminCreated).toBe(true);
  });

  it('后端 409 时把中文错误显示出来并停留在 Step 2', async () => {
    mocked.setup.mockRejectedValue(new Error('系统已完成初始化，无法重复执行'));

    const ok = await useOnboardingStore.getState().submitAdmin();

    expect(ok).toBe(false);
    expect(useOnboardingStore.getState().error).toBe('系统已完成初始化，无法重复执行');
    expect(useOnboardingStore.getState().step).toBe(2);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useOnboardingStore · 跳过向导', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
  });

  it('跳过成功后拿到一次性口令，并写入哨兵与强制改密标记', async () => {
    mocked.skipSetup.mockResolvedValue({
      token: 'skip-token',
      user: { ...validUser, username: 'admin' },
      generatedPassword: 'Ab3!securePass12',
      mustChangePassword: true,
    });

    const ok = await useOnboardingStore.getState().submitSkip();

    expect(ok).toBe(true);
    expect(useOnboardingStore.getState().generatedPassword).toBe('Ab3!securePass12');
    expect(useOnboardingStore.getState().finished).toBe(true);
    expect(isMustChangePassword()).toBe(true);
    expect(localStorage.getItem('dm_onboarded')).toBe('1');
    expect(localStorage.getItem('token')).toBe('skip-token');
  });

  it('跳过失败时不写哨兵（下次启动仍进入向导）', async () => {
    mocked.skipSetup.mockRejectedValue(new Error('系统已完成初始化，无法重复执行'));

    const ok = await useOnboardingStore.getState().submitSkip();

    expect(ok).toBe(false);
    expect(localStorage.getItem('dm_onboarded')).toBeNull();
    expect(isMustChangePassword()).toBe(false);
    expect(useOnboardingStore.getState().error).toBeTruthy();
  });
});

describe('useOnboardingStore · Step 3 配置', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
  });

  it('目录为空时拒绝继续', async () => {
    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().error).toContain('下载目录');
    expect(useOnboardingStore.getState().step).toBe(1);
  });

  it('保存配置后进入 Step 4，并落到本地配置', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: 'D:\\Downloads', maxConcurrent: 3, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 },
    });

    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().step).toBe(4);
    const raw = localStorage.getItem('dm_download_config');
    expect(raw && JSON.parse(raw)).toEqual({
      downloadDir: 'D:\\Downloads',
      maxConcurrent: 3,
      speedLimitKBps: 0,
      sensitiveKeywords: [],
      autoCleanupDays: 7,
    });
  });

  it('目录前后空格被裁掉', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: '  /data/dl  ', maxConcurrent: 5, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 },
    });

    await useOnboardingStore.getState().persistConfig();

    const saved = JSON.parse(localStorage.getItem('dm_download_config') ?? '{}') as { downloadDir: string };
    expect(saved.downloadDir).toBe('/data/dl');
  });

  it('m2：maxConcurrent 越界（99）拒绝保存，给出错误态且不进 Step 4、不落配置', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: 'D:\\Downloads', maxConcurrent: 99, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 },
    });

    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().error).toBeTruthy();
    expect(useOnboardingStore.getState().step).not.toBe(4);
    expect(localStorage.getItem('dm_download_config')).toBeNull();
  });

  it('m2：maxConcurrent 为 0 或 NaN 拒绝保存', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: 'D:\\Downloads', maxConcurrent: 0, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 },
    });
    await useOnboardingStore.getState().persistConfig();
    expect(useOnboardingStore.getState().error).toBeTruthy();
    expect(useOnboardingStore.getState().step).not.toBe(4);

    useOnboardingStore.setState({ error: null, config: { downloadDir: 'D:\\Downloads', maxConcurrent: Number.NaN, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 } });
    await useOnboardingStore.getState().persistConfig();
    expect(useOnboardingStore.getState().error).toBeTruthy();
    expect(localStorage.getItem('dm_download_config')).toBeNull();
  });

  it('m2：限速为负数拒绝保存', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: 'D:\\Downloads', maxConcurrent: 5, speedLimitKBps: -1, sensitiveKeywords: [], autoCleanupDays: 7 },
    });

    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().error).toBeTruthy();
    expect(useOnboardingStore.getState().step).not.toBe(4);
    expect(localStorage.getItem('dm_download_config')).toBeNull();
  });

  it('m2：纯空白目录拒绝保存（trim 后为空）', async () => {
    useOnboardingStore.setState({
      config: { downloadDir: '   ', maxConcurrent: 5, speedLimitKBps: 0, sensitiveKeywords: [], autoCleanupDays: 7 },
    });

    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().error).toContain('下载目录');
    expect(localStorage.getItem('dm_download_config')).toBeNull();
  });

  it('m2：表单字符串数字经 coerce 归一后合法保存', async () => {
    useOnboardingStore.setState({
      config: {
        downloadDir: 'D:\\Downloads',
        maxConcurrent: '3' as unknown as number,
        speedLimitKBps: '0' as unknown as number,
        sensitiveKeywords: [],
        autoCleanupDays: 7,
      },
    });

    await useOnboardingStore.getState().persistConfig();

    expect(useOnboardingStore.getState().step).toBe(4);
    const saved = JSON.parse(localStorage.getItem('dm_download_config') ?? '{}') as {
      maxConcurrent: number;
      speedLimitKBps: number;
    };
    expect(saved.maxConcurrent).toBe(3);
    expect(saved.speedLimitKBps).toBe(0);
  });
});
