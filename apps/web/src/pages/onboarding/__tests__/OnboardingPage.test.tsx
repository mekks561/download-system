import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import OnboardingPage from '../OnboardingPage';
import { useOnboardingStore } from '../../../store/useOnboardingStore';
import { useAppStore } from '../../../store/useAppStore';
import { resetOnboardingLocalState } from '../../../services/onboardingGate';

vi.mock('../../../services/OnboardingApiService', () => ({
  OnboardingApiService: {
    getStatus: vi.fn(),
    setup: vi.fn(),
    skipSetup: vi.fn(),
    isBackendHealthy: vi.fn().mockResolvedValue(true),
  },
}));

import { OnboardingApiService } from '../../../services/OnboardingApiService';

const mocked = OnboardingApiService as unknown as {
  setup: ReturnType<typeof vi.fn>;
  skipSetup: ReturnType<typeof vi.fn>;
  isBackendHealthy: ReturnType<typeof vi.fn>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <OnboardingPage />
    </MemoryRouter>,
  );

describe('OnboardingPage · 4 步向导', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
    useAppStore.setState({ user: null, isAuthenticated: false });
    mocked.isBackendHealthy.mockResolvedValue(true);
  });

  it('默认渲染 Step 1 欢迎页与进度指示', () => {
    renderPage();

    expect(screen.getByTestId('onboarding-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-progress')).toBeInTheDocument();
    expect(screen.getByText('继续 →')).toBeInTheDocument();
    expect(screen.getByText('跳过向导')).toBeInTheDocument();
  });

  it('点击继续进入 Step 2，返回可回退', async () => {
    renderPage();

    fireEvent.click(screen.getByTestId('onboarding-start'));
    expect(await screen.findByTestId('onboarding-step-2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('返回'));
    expect(await screen.findByTestId('onboarding-step-1')).toBeInTheDocument();
  });

  it('Step 2 提交非法表单：显示中文校验提示且不发请求', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('onboarding-start'));
    await screen.findByTestId('onboarding-step-2');

    fireEvent.change(screen.getByTestId('onboarding-username'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByTestId('onboarding-email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByTestId('onboarding-password'), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByTestId('onboarding-confirmPassword'), { target: { value: 'StrongPass123' } });

    fireEvent.click(screen.getByTestId('onboarding-create-admin'));

    expect(await screen.findByTestId('onboarding-username-error')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-email-error')).toBeInTheDocument();
    expect(mocked.setup).not.toHaveBeenCalled();
  });

  it('Step 2 密码不一致时给出提示', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('onboarding-start'));
    await screen.findByTestId('onboarding-step-2');

    fireEvent.change(screen.getByTestId('onboarding-username'), { target: { value: 'admin01' } });
    fireEvent.change(screen.getByTestId('onboarding-email'), { target: { value: 'admin@dm.local' } });
    fireEvent.change(screen.getByTestId('onboarding-password'), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByTestId('onboarding-confirmPassword'), { target: { value: 'Mismatch123' } });
    fireEvent.click(screen.getByTestId('onboarding-create-admin'));

    const err = await screen.findByTestId('onboarding-confirmPassword-error');
    expect(err.textContent).toContain('不一致');
    expect(mocked.setup).not.toHaveBeenCalled();
  });

  it('Step 2 创建成功后进入 Step 3，并展示密码强度条', async () => {
    mocked.setup.mockResolvedValue({
      token: 't',
      user: {
        id: 1,
        username: 'admin01',
        email: 'admin@dm.local',
        role: 'admin',
        createdAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T00:00:00.000Z',
      },
    });

    renderPage();
    fireEvent.click(screen.getByTestId('onboarding-start'));
    await screen.findByTestId('onboarding-step-2');

    fireEvent.change(screen.getByTestId('onboarding-username'), { target: { value: 'admin01' } });
    fireEvent.change(screen.getByTestId('onboarding-email'), { target: { value: 'admin@dm.local' } });
    fireEvent.change(screen.getByTestId('onboarding-password'), { target: { value: 'StrongPass123' } });
    expect(screen.getByTestId('onboarding-password-strength')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('onboarding-confirmPassword'), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByTestId('onboarding-create-admin'));

    expect(await screen.findByTestId('onboarding-step-3')).toBeInTheDocument();
  });

  it('Step 3 目录为空时不前进并提示，填入后进入 Step 4', async () => {
    renderPage();
    // 容器挂载时会 reset（每次进入向导都从 Step 1 开始），故状态在渲染后注入
    act(() => {
      useOnboardingStore.setState({ step: 3, adminCreated: true });
    });
    await screen.findByTestId('onboarding-step-3');

    fireEvent.click(screen.getByTestId('onboarding-save-config'));
    expect(await screen.findByTestId('onboarding-error')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('onboarding-downloadDir'), { target: { value: 'D:\\Downloads' } });
    fireEvent.click(screen.getByTestId('onboarding-save-config'));

    expect(await screen.findByTestId('onboarding-step-4')).toBeInTheDocument();
  });

  it('Step 4 完成后写哨兵（不依赖后端可用）', async () => {
    mocked.isBackendHealthy.mockResolvedValue(false);
    renderPage();
    act(() => {
      useOnboardingStore.setState({
        step: 4,
        adminCreated: true,
        config: { downloadDir: 'D:\\Downloads', maxConcurrent: 5, speedLimitKBps: 0 },
      });
    });
    await screen.findByTestId('onboarding-step-4');

    // 后端不可用时给提示但不阻塞
    expect(await screen.findByTestId('onboarding-db-warning')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('onboarding-finish'));

    await waitFor(() => {
      expect(localStorage.getItem('dm_onboarded')).toBe('1');
    });
  });

  it('跳过向导后必须展示一次性口令，勾选确认后才可进入系统', async () => {
    mocked.skipSetup.mockResolvedValue({
      token: 'skip-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@dm.local',
        role: 'admin',
        createdAt: '2026-09-30T00:00:00.000Z',
        updatedAt: '2026-09-30T00:00:00.000Z',
      },
      generatedPassword: 'Ab3!securePass12',
      mustChangePassword: true,
    });

    renderPage();
    fireEvent.click(screen.getByTestId('onboarding-skip'));

    expect(await screen.findByTestId('onboarding-password-value')).toHaveTextContent('Ab3!securePass12');

    const enter = screen.getByTestId('onboarding-enter-app');
    expect(enter).toBeDisabled();

    fireEvent.click(screen.getByTestId('onboarding-ack-password'));
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-enter-app')).not.toBeDisabled();
    });
  });

  it('跳过失败时显示后端中文错误，且不跳出向导', async () => {
    mocked.skipSetup.mockRejectedValue(new Error('系统已完成初始化，无法重复执行'));

    renderPage();
    fireEvent.click(screen.getByTestId('onboarding-skip'));

    const err = await screen.findByTestId('onboarding-error');
    expect(err.textContent).toContain('系统已完成初始化');
    expect(screen.getByTestId('onboarding-step-1')).toBeInTheDocument();
  });
});
