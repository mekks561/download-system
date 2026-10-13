/**
 * GM 后台请求层（fetch 封装）。
 *
 * 后端信封统一 `{ success, data | error: { code, message }, timestamp }`：
 * - success=true → 解包返回 data；
 * - 否则抛 ApiError（带 code/message/status），调用方按 code 展示文案。
 *
 * 401（UNAUTHORIZED / token 失效）统一触发 onUnauthorized 回调（由 store 注入），
 * 清空会话并让路由层跳回 /login。
 */

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

let tokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let csrfToken: string | null = null;
let isFetchingCsrf = false;
let csrfSubscribers: Array<(token: string) => void> = [];

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (isFetchingCsrf) {
    return new Promise((resolve) => {
      csrfSubscribers.push(resolve);
    });
  }

  isFetchingCsrf = true;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include' });
    const envelope = (await res.json()) as ApiEnvelope<{ token: string }>;
    csrfToken = envelope.data!.token;
    csrfSubscribers.forEach((callback) => callback(csrfToken!));
    csrfSubscribers = [];
    return csrfToken!;
  } catch (error) {
    console.error('获取 CSRF Token 失败:', error);
    throw error;
  } finally {
    isFetchingCsrf = false;
  }
}

/** 由 auth store 在模块加载时注入，避免 api 层反向依赖 store 造成环 */
export function configureApi(getToken: () => string | null, handleUnauthorized: () => void): void {
  tokenGetter = getToken;
  onUnauthorized = handleUnauthorized;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenGetter();
  const method = options.method ?? 'GET';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 非 GET/HEAD/OPTIONS 请求注入 CSRF Token
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      const token = await fetchCsrfToken();
      headers['x-csrf-token'] = token;
    } catch (e) {
      console.warn('跳过 CSRF Token 注入 (请求可能失败):', e);
    }
  }

  const res = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(res.status, 'NETWORK_ERROR', `请求失败（HTTP ${res.status}）`);
  }

  if (res.status === 401 && envelope.error?.code === 'UNAUTHORIZED') {
    onUnauthorized();
  }

  if (!envelope.success) {
    throw new ApiError(
      res.status,
      envelope.error?.code ?? 'UNKNOWN_ERROR',
      envelope.error?.message ?? '未知错误',
    );
  }

  return envelope.data as T;
}

/** 后端错误码 → 前端文案（未命中时回退到后端 message） */
const ERROR_TEXT: Record<string, string> = {
  INVALID_CREDENTIALS: '用户名或密码错误',
  UNAUTHORIZED: '登录已失效，请重新登录',
  ACCOUNT_DISABLED: '账号已被禁用',
  GM_SELF_PROTECTION: '不能降级或禁用当前 GM 关联的管理员账号',
  NOT_FOUND: '记录不存在',
  NETWORK_ERROR: '网络请求失败，请稍后重试',
};

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_TEXT[error.code] ?? error.message;
  }
  return error instanceof Error ? error.message : '未知错误';
}
