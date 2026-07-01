import { apiClient, ApiResponse } from './ApiClient';
import { DownloadItem, DownloadStatus } from '../types';

export interface CreateDownloadRequest {
  url: string;
  filename?: string;
  priority?: 'low' | 'normal' | 'high';
  autoStart?: boolean;
}

export interface UpdateDownloadRequest {
  status?: DownloadStatus;
  progress?: number;
}

export interface DownloadStatsResponse {
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalSize: number;
  downloadedSize: number;
}

export class DownloadApiService {
  public static async getAllDownloads(
    page?: number,
    pageSize?: number
  ): Promise<ApiResponse<DownloadItem[]>> {
    const params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.pageSize = pageSize;
    return apiClient.get<DownloadItem[]>('/downloads', params);
  }

  public static async getDownloadById(id: string): Promise<ApiResponse<DownloadItem>> {
    return apiClient.get<DownloadItem>(`/downloads/${id}`);
  }

  public static async createDownload(
    data: CreateDownloadRequest
  ): Promise<ApiResponse<DownloadItem>> {
    return apiClient.post<DownloadItem>('/downloads', data);
  }

  public static async updateDownload(
    id: string,
    data: UpdateDownloadRequest
  ): Promise<ApiResponse<DownloadItem>> {
    return apiClient.put<DownloadItem>(`/downloads/${id}`, data);
  }

  public static async deleteDownload(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/downloads/${id}`);
  }

  public static async startDownload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/downloads/${id}/start`);
  }

  public static async pauseDownload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/downloads/${id}/pause`);
  }

  public static async resumeDownload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/downloads/${id}/resume`);
  }

  public static async cancelDownload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/downloads/${id}/cancel`);
  }

  public static async getDownloadStats(): Promise<ApiResponse<DownloadStatsResponse>> {
    return apiClient.get<DownloadStatsResponse>('/downloads/stats');
  }

  public static async clearCompleted(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>('/downloads/completed');
  }
}
