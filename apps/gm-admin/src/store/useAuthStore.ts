import { create } from 'zustand';
import { configureApi } from '../lib/api';

/**
 * GM 会话（zustand）。
 *
 * token 存 sessionStorage：GM JWT 有效期 8h，属后台会话语义，
 * 关闭浏览器标签即清除，比 localStorage 更贴合（主站用 localStorage）。
 */

const TOKEN_KEY = 'gm_token';
const USER_KEY = 'gm_user';

export interface GmUserInfo {
  id: number;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  gmUser: GmUserInfo | null;
  login: (token: string, gmUser: GmUserInfo) => void;
  logout: () => void;
}

function readStoredUser(): GmUserInfo | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GmUserInfo;
  } catch {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem(TOKEN_KEY),
  gmUser: readStoredUser(),
  login: (token, gmUser) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(gmUser));
    set({ token, gmUser });
  },
  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    set({ token: null, gmUser: null });
  },
}));

// 注入请求层：401（UNAUTHORIZED）→ 清空会话，RequireAuth 负责跳回 /login
configureApi(
  () => useAuthStore.getState().token,
  () => useAuthStore.getState().logout(),
);
