import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Step2Admin from '../Step2Admin';
import { useOnboardingStore } from '../../../store/useOnboardingStore';
import { resetOnboardingLocalState } from '../../../services/onboardingGate';

vi.mock('../../../services/OnboardingApiService', () => ({
  OnboardingApiService: {
    getStatus: vi.fn(),
    setup: vi.fn(),
    skipSetup: vi.fn(),
    isBackendHealthy: vi.fn(),
  },
}));

const fill = (fields: Record<string, string>) => {
  for (const [id, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByTestId(`onboarding-${id}`), { target: { value } });
  }
};

describe('Step2Admin · 弱密码实时禁用「创建并继续」（m3）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    useOnboardingStore.getState().reset();
  });

  it('空表单时按钮禁用', () => {
    render(<Step2Admin />);
    expect(screen.getByTestId('onboarding-create-admin')).toBeDisabled();
  });

  it('全部合法（含两次一致的强密码）时按钮可用', () => {
    render(<Step2Admin />);
    fill({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
    });
    expect(screen.getByTestId('onboarding-create-admin')).not.toBeDisabled();
  });

  it('弱密码（不足 8 位）即使其余字段合法也禁用，且强度条仍实时渲染', () => {
    render(<Step2Admin />);
    fill({
      username: 'admin01',
      email: 'admin@dm.local',
      password: '123',
      confirmPassword: '123',
    });
    expect(screen.getByTestId('onboarding-create-admin')).toBeDisabled();
    expect(screen.getByTestId('onboarding-password-strength')).toBeInTheDocument();
  });

  it('密码合法但两次输入不一致时禁用', () => {
    render(<Step2Admin />);
    fill({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass456',
    });
    expect(screen.getByTestId('onboarding-create-admin')).toBeDisabled();
  });

  it('用户名不满足同一套 Zod 规则时同样禁用（不单独给密码开口子）', () => {
    render(<Step2Admin />);
    fill({
      username: 'ab',
      email: 'admin@dm.local',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
    });
    expect(screen.getByTestId('onboarding-create-admin')).toBeDisabled();

    fireEvent.change(screen.getByTestId('onboarding-username'), { target: { value: 'admin01' } });
    expect(screen.getByTestId('onboarding-create-admin')).not.toBeDisabled();
  });

  it('从非法改回合法后按钮恢复可用（实时判定，无需提交）', () => {
    render(<Step2Admin />);
    fill({
      username: 'admin01',
      email: 'admin@dm.local',
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(screen.getByTestId('onboarding-create-admin')).toBeDisabled();

    fireEvent.change(screen.getByTestId('onboarding-password'), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByTestId('onboarding-confirmPassword'), { target: { value: 'StrongPass123' } });

    expect(screen.getByTestId('onboarding-create-admin')).not.toBeDisabled();
  });
});
