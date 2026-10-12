// C1 回归测试：App 首次运行重定向（FirstRunRedirect）
//
// 评审曾发现：needsOnboarding 只在挂载时取一次，向导完成/跳过先写哨兵再导航
// /downloads，旧逻辑仅凭陈旧的 needsOnboarding=true 就把人弹回 /onboarding。
// 这里用真实的 onboardingGate 哨兵实现（仅打桩 shouldOnboard 与后端调用），
// 覆盖：全新状态拦截、完成后落地、跳过后落地，以及后端不可用 fail-open。
//
// 重型边界模块（Layout/Provider/业务页）全部打桩，保留真实的 App 路由+向导页+store。
import React from 'react';
import { configure, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Outlet } from 'react-router';
import App from '../App';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useAppStore } from '../store/useAppStore';
import { shouldOnboard } from '../services/onboardingGate';

vi.mock('../i18n', () => ({}));

const { Passthrough } = vi.hoisted(() => ({
  Passthrough: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

vi.mock('../components/layout', () => ({
  Layout: () => (
    <div>
      MAIN_APP_LAYOUT
      <Outlet />
    </div>
  ),
}));
vi.mock('../components/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/ErrorBoundary', () => ({ default: Passthrough }));
vi.mock('../components/Toast', () => ({
  ToastProvider: Passthrough,
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../services/notificationService', () => ({ NotificationProvider: Passthrough }));
vi.mock('../services/searchHistoryService', () => ({ SearchHistoryProvider: Passthrough }));
vi.mock('../services/speedLimitService', () => ({ SpeedLimitProvider: Passthrough }));
vi.mock('../components/ui/shadcn', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, TooltipProvider: Passthrough };
});

vi.mock('../pages/Home', () => ({ default: () => <div>HOME_PAGE</div> }));
vi.mock('../pages/Downloads', () => ({ default: () => <div>DOWNLOADS_PAGE</div> }));
vi.mock('../pages/Uploads', () => ({ default: () => <div>UPLOADS_PAGE</div> }));
vi.mock('../pages/Statistics', () => ({ default: () => <div>STATS_PAGE</div> }));
vi.mock('../pages/Schedule', () => ({ default: () => <div>SCHEDULE_PAGE</div> }));
vi.mock('../pages/Sharing', () => ({ default: () => <div>SHARING_PAGE</div> }));
vi.mock('../pages/History', () => ({ default: () => <div>HISTORY_PAGE</div> }));
vi.mock('../pages/Settings', () => ({ default: () => <div>SETTINGS_PAGE</div> }));
vi.mock('../pages/ErrorPage', () => ({ default: () => <div>ERROR_PAGE</div> }));
vi.mock('../pages/Files', () => ({ default: () => <div>FILES_PAGE</div> }));
vi.mock('../pages/Profile', () => ({ default: () => <div>PROFILE_PAGE</div> }));
vi.mock('../pages/LoginPage', () => ({ default: () => <div>LOGIN_PAGE</div> }));
vi.mock('../pages/SharePreview', () => ({ default: () => <div>SHARE_PREVIEW</div> }));

// 只打桩首运行判定；hasOnboarded/markOnboarded 等保留真实 localStorage 实现，
// 这样「写哨兵 → 导航 → 重定向守卫读哨兵」是完整真实链路
vi.mock('../services/onboardingGate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/onboardingGate')>();
  return {
    ...actual,
    shouldOnboard: vi.fn().mockResolvedValue(true),
  };
});

const { authInstance } = vi.hoisted(() => ({
  authInstance: { isAuthenticated: () => false, getProfile: () => undefined },
}));
vi.mock('../services/AuthService', () => ({
  AuthService: {
    getInstance: () => authInstance,
  },
}));

vi.mock('../services/OnboardingApiService', () => ({
  OnboardingApiService: {
    getStatus: vi.fn().mockResolvedValue({ needsSetup: true }),
    setup: vi.fn(),
    skipSetup: vi.fn(),
    isBackendHealthy: vi.fn().mockResolvedValue(true),
  },
}));

import { OnboardingApiService } from '../services/OnboardingApiService';

// 断言本身不变（仍是「向导页出现 / 主界面出现」），只是把等待上限放宽：
// 本文件大量 `findBy*` 等的是 lazy 加载的向导页 chunk，而 vitest 会并行跑
// 22 个 jsdom 文件，默认 1s 在负载高时会被打满，出现过非确定性失败。
// configure 只作用于本文件的测试环境（vitest 按文件隔离模块注册表）。
configure({ asyncUtilTimeout: 5000 });

const mockedGate = shouldOnboard as unknown as ReturnType<typeof vi.fn>;
const mockedApi = OnboardingApiService as unknown as {
  skipSetup: ReturnType<typeof vi.fn>;
};

const skipUser = {
  id: 1,
  username: 'admin',
  email: 'admin@dm.local',
  role: 'admin' as const,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
};

/** 再等一拍，确保重定向 effect 即使要弹回也已经发生过 */
async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
}

describe('App 首次运行重定向回归（C1）', () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().reset();
    useAppStore.setState({ user: null, isAuthenticated: false });
    mockedGate.mockReset().mockResolvedValue(true);
    mockedApi.skipSetup.mockReset();
  });

  it('(a) 全新状态（无哨兵 + needsSetup=true）访问 /downloads → 重定向到 /onboarding', async () => {
    window.history.replaceState(null, '', '/downloads');

    render(<App />);

    await screen.findByTestId('onboarding-step-1');
    expect(window.location.pathname).toBe('/onboarding');
    expect(screen.queryByText('DOWNLOADS_PAGE')).not.toBeInTheDocument();
  });

  it('(b) 走完向导并完成后访问 /downloads → 留在 /downloads，不被弹回', async () => {
    window.history.replaceState(null, '', '/onboarding');
    render(<App />);

    await screen.findByTestId('onboarding-step-1');

    // 直接把 store 推到 Step4（与 proof 相同的真实完成路径入口）
    act(() => {
      useOnboardingStore.setState({
        step: 4,
        adminCreated: true,
        config: { downloadDir: 'D:\\Downloads', maxConcurrent: 5, speedLimitKBps: 0 },
      });
    });
    await screen.findByTestId('onboarding-step-4');

    fireEvent.click(screen.getByTestId('onboarding-finish'));

    await screen.findByText('DOWNLOADS_PAGE');
    expect(window.location.pathname).toBe('/downloads');
    expect(localStorage.getItem('dm_onboarded')).toBe('1');

    await settle();
    expect(window.location.pathname).toBe('/downloads');
    expect(screen.queryByTestId('onboarding-step-1')).not.toBeInTheDocument();
  });

  it('(c) 跳过向导（哨兵已写 + 一次性口令确认）后访问 /downloads → 留在 /downloads', async () => {
    mockedApi.skipSetup.mockResolvedValue({
      token: 'skip-token',
      user: skipUser,
      generatedPassword: 'Ab3!securePass12',
      mustChangePassword: true,
    });

    window.history.replaceState(null, '', '/onboarding');
    render(<App />);

    await screen.findByTestId('onboarding-step-1');
    fireEvent.click(screen.getByTestId('onboarding-skip'));

    // 跳过成功即同步写哨兵，随后展示一次性口令面板
    await screen.findByTestId('onboarding-password-value');
    await waitFor(() => expect(localStorage.getItem('dm_onboarded')).toBe('1'));

    fireEvent.click(screen.getByTestId('onboarding-ack-password'));
    fireEvent.click(screen.getByTestId('onboarding-enter-app'));

    await screen.findByText('DOWNLOADS_PAGE');
    expect(window.location.pathname).toBe('/downloads');

    await settle();
    expect(window.location.pathname).toBe('/downloads');
    expect(screen.queryByTestId('onboarding-step-1')).not.toBeInTheDocument();
  });

  it('(d) 后端不可用时 fail-open：不把用户锁进向导', async () => {
    mockedGate.mockRejectedValueOnce(new Error('network down'));
    window.history.replaceState(null, '', '/downloads');

    render(<App />);

    await screen.findByText('DOWNLOADS_PAGE');
    expect(window.location.pathname).toBe('/downloads');
    await settle();
    expect(window.location.pathname).toBe('/downloads');
  });
});
