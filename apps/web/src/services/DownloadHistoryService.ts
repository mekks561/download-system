import { apiClient } from './ApiClient';

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

  private constructor() {}

  public static getInstance(): DownloadHistoryService {
    if (!DownloadHistoryService.instance) {
      DownloadHistoryService.instance = new DownloadHistoryService();
    }
    return DownloadHistoryService.instance;
  }

  public async getDownloadHistory(): Promise<DownloadRecord[]> {
    try {
      const response = await apiClient.get<{ data: DownloadRecord[] }>('/downloads');
      return response.data?.data || [];
    } catch {
      return [];
    }
  }

  public async addDownloadRecord(url: string, filename: string): Promise<DownloadRecord | null> {
    try {
      const response = await apiClient.post<{ data: DownloadRecord }>('/downloads', { url, filename });
      return response.data?.data || null;
    } catch {
      return null;
    }
  }

  public async updateDownloadRecord(id: number, updates: Partial<DownloadRecord>): Promise<DownloadRecord | null> {
    try {
      const response = await apiClient.put<{ data: DownloadRecord }>(`/downloads/${id}`, updates);
      return response.data?.data || null;
    } catch {
      return null;
    }
  }

  public async deleteDownloadRecord(id: number): Promise<boolean> {
    try {
      const response = await apiClient.delete<void>(`/downloads/${id}`);
      return response.success;
    } catch {
      return false;
    }
  }

  public async clearCompletedDownloads(): Promise<boolean> {
    try {
      const response = await apiClient.delete<void>('/downloads/clear');
      return response.success;
    } catch {
      return false;
    }
  }
}