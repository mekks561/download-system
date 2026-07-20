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
  uploadStatusStats: Array<{ status: string; count: number }>;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  downloadCount: number;
  uploadCount: number;
  created_at: string;
  updated_at?: string;
  role: string;
}

export interface DownloadData {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  filename: string;
  url: string;
  status: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  created_at: string;
  completed_at?: string;
}

export interface UploadData {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  filename: string;
  original_filename: string;
  file_path?: string;
  status: string;
  progress: number;
  uploaded_bytes: number;
  total_bytes: number;
  created_at: string;
  completed_at?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  pagination?: PaginationInfo;
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
      const response = await axios.get<ApiResponse<StatsData>>(`${API_BASE_URL}/stats`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || '获取统计信息失败' : '获取统计信息失败'
      };
    }
  }

  async getUsers(page: number = 1, limit: number = 10, search: string = ''): Promise<ApiResponse<UserData[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) params.append('search', search);

      const response = await axios.get<ApiResponse<UserData[]>>(`${API_BASE_URL}/users?${params}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || '获取用户列表失败' : '获取用户列表失败'
      };
    }
  }

  async getAllDownloads(page: number = 1, limit: number = 10, search: string = '', status: string = ''): Promise<ApiResponse<DownloadData[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await axios.get<ApiResponse<DownloadData[]>>(`${API_BASE_URL}/downloads?${params}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || '获取下载记录失败' : '获取下载记录失败'
      };
    }
  }

  async getAllUploads(page: number = 1, limit: number = 10, search: string = '', status: string = ''): Promise<ApiResponse<UploadData[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await axios.get<ApiResponse<UploadData[]>>(`${API_BASE_URL}/uploads?${params}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || '获取上传记录失败' : '获取上传记录失败'
      };
    }
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    try {
      const response = await axios.delete<ApiResponse>(`${API_BASE_URL}/users/${id}`, {
        headers: this.authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || '删除用户失败' : '删除用户失败'
      };
    }
  }
}

export default GmDashboardService;