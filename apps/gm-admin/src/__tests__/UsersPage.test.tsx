import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../pages/UsersPage';
import { useAuthStore } from '../store/useAuthStore';

const now = '2026-10-07T00:00:00.000Z';

function makeUser(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    username: `user${id}`,
    email: `user${id}@example.com`,
    role: 'user',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function envelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data, timestamp: now }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetchQueue(...responses: Response[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('UsersPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({ token: 'gm-token', gmUser: { id: 1, username: 'gmroot', role: 'admin' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('列表分页渲染：users 键解包、展示 total，点击下一页请求 page=2', async () => {
    const page1 = envelope({ users: [makeUser(1), makeUser(2)], total: 25, page: 1, pageSize: 20 });
    const page2 = envelope({ users: [makeUser(21)], total: 25, page: 2, pageSize: 20 });
    const fetchMock = mockFetchQueue(page1, page2);

    render(<UsersPage />);

    await waitFor(() => expect(screen.getByText('user1')).toBeInTheDocument());
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/gm/users?page=1&pageSize=20', expect.anything());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '下一页' }));

    await waitFor(() => expect(screen.getByText('user21')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/gm/users?page=2&pageSize=20', expect.anything());
  });

  it('禁用确认流：点击禁用 → 确认对话框 → 确认后 PATCH isActive=false 且行状态更新', async () => {
    const list = envelope({ users: [makeUser(1)], total: 1, page: 1, pageSize: 20 });
    const patched = envelope({ user: makeUser(1, { isActive: false }) });
    const fetchMock = mockFetchQueue(list, patched);

    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('user1')).toBeInTheDocument());
    expect(screen.getByText('正常')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '禁用' }));
    // 确认对话框出现
    expect(await screen.findByText('确认禁用账号')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(screen.getByText('已禁用')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gm/users/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ isActive: false }) }),
    );
  });

  it('重置密码校验：<8 位显示校验错误且不提交，≥8 位提交成功', async () => {
    const list = envelope({ users: [makeUser(1)], total: 1, page: 1, pageSize: 20 });
    const fetchMock = mockFetchQueue(list);

    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('user1')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '重置密码' }));
    expect(await screen.findByText('为用户「user1」设置新密码')).toBeInTheDocument();

    // 7 位：校验错误，不发请求
    await user.type(screen.getByLabelText('新密码'), 'short12');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('新密码至少 8 个字符')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 8 位：提交成功，对话框关闭
    fetchMock.mockResolvedValueOnce(envelope(null));
    await user.clear(screen.getByLabelText('新密码'));
    await user.type(screen.getByLabelText('新密码'), 'newpass123');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() =>
      expect(screen.queryByText('为用户「user1」设置新密码')).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/gm/users/1/reset-password',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ newPassword: 'newpass123' }) }),
    );
  });
});
