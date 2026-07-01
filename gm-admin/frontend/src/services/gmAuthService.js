import axios from 'axios';

const API_BASE_URL = '/gm-api';

class GmAuthService {
  static instance = null;

  static getInstance() {
    if (!GmAuthService.instance) {
      GmAuthService.instance = new GmAuthService();
    }
    return GmAuthService.instance;
  }

  constructor() {
    this.token = localStorage.getItem('gm_token');
  }

  getAuthHeaders() {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
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
        message: error.response?.data?.message || '登录失败'
      };
    }
  }

  async getProfile() {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '获取用户信息失败'
      };
    }
  }

  async logout() {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('gm_token');
      localStorage.removeItem('gm_user');
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('gm_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }
}

export default GmAuthService;
