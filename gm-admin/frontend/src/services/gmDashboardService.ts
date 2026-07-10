import axios from 'axios';
import GmAuthService from './gmAuthService';

const API_BASE_URL = '/gm-api';

export interface StatsData {
  userCount: number;
  downloadCount: number;
  uploadCount: number;
  todayDownloads: number;
  todayUploads: number;
  downloadStatusStats: Array<{ status: string; count: number }>;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  downloadCount: number;
  uploadCount: number;
  created_at: string;
  role: string;
}

export interface DownloadData {
  id: number;
  username?: string;
  email?: string;
  filename: string;
  url: string;
  status: string;
  progress: number;
  total_bytes: number;
  created_at: string;
}

export interface UploadData {
  id: number;
  username?: string;
  email?: string;
  original_filename: string;
  status: string;
  progress: number;
  total_bytes: number;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

class GmDashboardService {
  private static instance: GmDashboardService | null = null;
  private authService: GmAuthService;

  private constructor() {
    this.authService = GmAuthService.getInstance();
  }

  static getInstance(): GmDashboardService {
    if (!GmDashboardService.instance) {
      GmDashboardService.instance = new GmDashboardService();
    }
    return GmDashboardService.instance;
  }

  async getStats(): Promise<ApiResponse<StatsData>> {
    try {
      const response = await axios.get<ApiResponse<StatsData>>(`${API_BASE_URL}/dashboard/stats`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '获取统计信息失败' : '获取统计信息失败'
      };
    }
  }

  async getUsers(): Promise<ApiResponse<UserData[]>> {
    try {
      const response = await axios.get<ApiResponse<UserData[]>>(`${API_BASE_URL}/dashboard/users`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '获取用户列表失败' : '获取用户列表失败'
      };
    }
  }

  async getAllDownloads(): Promise<ApiResponse<DownloadData[]>> {
    try {
      const response = await axios.get<ApiResponse<DownloadData[]>>(`${API_BASE_URL}/dashboard/downloads`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '获取下载记录失败' : '获取下载记录失败'
      };
    }
  }

  async getAllUploads(): Promise<ApiResponse<UploadData[]>> {
    try {
      const response = await axios.get<ApiResponse<UploadData[]>>(`${API_BASE_URL}/dashboard/uploads`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '获取上传记录失败' : '获取上传记录失败'
      };
    }
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    try {
      const response = await axios.delete<ApiResponse>(`${API_BASE_URL}/dashboard/users/${id}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? error.response?.data?.message || '删除用户失败' : '删除用户失败'
      };
    }
  }
}

export default GmDashboardService;
