import axios from 'axios';

const API_BASE_URL = '/gm-api';

export interface GmUser {
  id: number;
  username: string;
  name?: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'viewer';
  email?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  gmUser?: GmUser;
  message?: string;
}

export interface ProfileResponse {
  success: boolean;
  data?: GmUser;
  message?: string;
}

class GmAuthService {
  private static instance: GmAuthService | null = null;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('gm_token');
  }

  static getInstance(): GmAuthService {
    if (!GmAuthService.instance) {
      GmAuthService.instance = new GmAuthService();
    }
    return GmAuthService.instance;
  }

  getAuthHeaders() {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        localStorage.setItem('gm_token', this.token);
        localStorage.setItem('gm_user', JSON.stringify(response.data.gmUser));
      }

      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '登录失败' : '登录失败'
      };
    }
  }

  async getProfile(): Promise<ProfileResponse> {
    try {
      const response = await axios.get<ProfileResponse>(`${API_BASE_URL}/auth/profile`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '获取用户信息失败' : '获取用户信息失败'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: this.getAuthHeaders()
      });
    } catch {
      // ignore
    } finally {
      this.token = null;
      localStorage.removeItem('gm_token');
      localStorage.removeItem('gm_user');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): GmUser | null {
    try {
      const userStr = localStorage.getItem('gm_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
}

export default GmAuthService;
