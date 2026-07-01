import axios from 'axios';
import { AuthService } from './AuthService';

const API_BASE_URL = 'http://localhost:5001/api';

export interface DownloadRecord {
  id: number;
  url: string;
  filename: string;
  status: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  created_at: string;
  completed_at?: string;
}

export class DownloadHistoryService {
  private static instance: DownloadHistoryService;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): DownloadHistoryService {
    if (!DownloadHistoryService.instance) {
      DownloadHistoryService.instance = new DownloadHistoryService();
    }
    return DownloadHistoryService.instance;
  }

  public async getDownloadHistory(): Promise<DownloadRecord[]> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/downloads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('获取下载历史失败:', error);
      return [];
    }
  }

  public async addDownloadRecord(url: string, filename: string): Promise<DownloadRecord | null> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/downloads`,
        { url, filename },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data || null;
    } catch (error: any) {
      console.error('添加下载记录失败:', error);
      return null;
    }
  }

  public async updateDownloadRecord(id: number, updates: Partial<DownloadRecord>): Promise<DownloadRecord | null> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/downloads/${id}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data || null;
    } catch (error: any) {
      console.error('更新下载记录失败:', error);
      return null;
    }
  }

  public async deleteDownloadRecord(id: number): Promise<boolean> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    try {
      await axios.delete(`${API_BASE_URL}/downloads/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error: any) {
      console.error('删除下载记录失败:', error);
      return false;
    }
  }

  public async clearCompletedDownloads(): Promise<boolean> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    try {
      await axios.delete(`${API_BASE_URL}/downloads/clear`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error: any) {
      console.error('清空已完成下载失败:', error);
      return false;
    }
  }
}