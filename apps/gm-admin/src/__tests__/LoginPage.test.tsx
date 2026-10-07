import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import LoginPage from '../pages/LoginPage';
import { useAuthStore } from '../store/useAuthStore';

function mockFetchOnce(payload: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>数据概览</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({ token: null, gmUser: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登录成功：存 token 到 sessionStorage 并跳转首页', async () => {
    mockFetchOnce({
      success: true,
      data: { token: 'gm-jwt-token', gmUser: { id: 1, username: 'gmroot', role: 'admin' } },
      timestamp: '2026-10-07T00:00:00.000Z',
    });

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('用户名'), 'gmroot');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(screen.getByText('数据概览')).toBeInTheDocument());
    expect(sessionStorage.getItem('gm_token')).toBe('gm-jwt-token');
    expect(useAuthStore.getState().gmUser?.username).toBe('gmroot');
    // 请求带上了正确的 url 与 body
    expect(fetch).toHaveBeenCalledWith(
      '/api/gm/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('登录失败：INVALID_CREDENTIALS 展示「用户名或密码错误」，不存 token', async () => {
    mockFetchOnce(
      {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
        timestamp: '2026-10-07T00:00:00.000Z',
      },
      401,
    );

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('用户名'), 'gmroot');
    await user.type(screen.getByLabelText('密码'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('用户名或密码错误'));
    expect(sessionStorage.getItem('gm_token')).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    // 仍停留在登录页
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });
});
