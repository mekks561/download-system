import axios from 'axios';
import GmAuthService from './gmAuthService';

const API_BASE_URL = '/gm-api';

class GmDashboardService {
  static instance = null;

  static getInstance() {
    if (!GmDashboardService.instance) {
      GmDashboardService.instance = new GmDashboardService();
    }
    return GmDashboardService.instance;
  }

  constructor() {
    this.authService = GmAuthService.getInstance();
  }

  async getStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '获取统计信息失败'
      };
    }
  }

  async getUsers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/users`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '获取用户列表失败'
      };
    }
  }

  async getAllDownloads() {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/downloads`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '获取下载记录失败'
      };
    }
  }

  async getAllUploads() {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/uploads`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '获取上传记录失败'
      };
    }
  }

  async deleteUser(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/dashboard/users/${id}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '删除用户失败'
      };
    }
  }
}

export default GmDashboardService;
