import { ApiError, apiRequest } from '../lib/api';
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

describe('api 请求层', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({ token: null, gmUser: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('成功信封解包返回 data，并携带 Authorization 头', async () => {
    useAuthStore.getState().login('gm-token', { id: 1, username: 'gmroot', role: 'admin' });
    mockFetchOnce({ success: true, data: { userCount: 5 }, timestamp: '2026-10-07T00:00:00.000Z' });

    const data = await apiRequest<{ userCount: number }>('/gm/dashboard');

    expect(data.userCount).toBe(5);
    expect(fetch).toHaveBeenCalledWith(
      '/api/gm/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer gm-token' }),
      }),
    );
  });

  it('非 success 信封抛 ApiError（带 code/message/status）', async () => {
    mockFetchOnce(
      { success: false, error: { code: 'CONFLICT', message: '仅 pending/paused 可取消' }, timestamp: 'x' },
      409,
    );

    const err = await apiRequest('/gm/downloads/1/cancel', { method: 'POST' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('CONFLICT');
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe('仅 pending/paused 可取消');
  });

  it('401 UNAUTHORIZED 统一清 token 登出', async () => {
    useAuthStore.getState().login('expired-token', { id: 1, username: 'gmroot', role: 'admin' });
    expect(sessionStorage.getItem('gm_token')).toBe('expired-token');

    mockFetchOnce(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'GM 认证令牌无效' }, timestamp: 'x' },
      401,
    );

    await expect(apiRequest('/gm/users')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(useAuthStore.getState().token).toBeNull();
    expect(sessionStorage.getItem('gm_token')).toBeNull();
  });
});
