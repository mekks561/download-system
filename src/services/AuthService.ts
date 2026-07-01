import { UserApiService } from './UserApiService';

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export class AuthService {
  private static instance: AuthService;
  private token: string | null = null;

  private constructor() {
    this.token = localStorage.getItem('token');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('token', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  public async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await UserApiService.register({ username, email, password });
    if (response.success && response.data) {
      this.setToken(response.data.token);
      const user = {
        ...response.data.user,
        id: String(response.data.user.id),
      };
      return {
        success: true,
        message: response.message || '注册成功',
        token: response.data.token,
        user,
      };
    }
    return {
      success: false,
      message: response.message || '注册失败',
    };
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await UserApiService.login({ email, password });
    if (response.success && response.data) {
      this.setToken(response.data.token);
      const user = {
        ...response.data.user,
        id: String(response.data.user.id),
      };
      return {
        success: true,
        message: response.message || '登录成功',
        token: response.data.token,
        user,
      };
    }
    return {
      success: false,
      message: response.message || '登录失败',
    };
  }

  public async logout(): Promise<void> {
    await UserApiService.logout();
    this.clearToken();
  }

  public async getProfile(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;
    this.token = token;
    const response = await UserApiService.getProfile();
    if (response.success && response.data) {
      return response.data.user;
    }
    this.clearToken();
    return null;
  }
}
