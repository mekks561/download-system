import { apiClient, ApiResponse } from './ApiClient';
import { UploadItem, UploadStatus } from '../types';

export interface CreateUploadRequest {
  filename?: string;
  overwrite?: boolean;
}

export interface UpdateUploadRequest {
  status?: UploadStatus;
  progress?: number;
}

export interface UploadStatsResponse {
  totalUploads: number;
  completedUploads: number;
  failedUploads: number;
  totalSize: number;
  uploadedSize: number;
}

export class UploadApiService {
  public static async getAllUploads(
    page?: number,
    pageSize?: number
  ): Promise<ApiResponse<UploadItem[]>> {
    const params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.pageSize = pageSize;
    return apiClient.get<UploadItem[]>('/uploads', params);
  }

  public static async getUploadById(id: string): Promise<ApiResponse<UploadItem>> {
    return apiClient.get<UploadItem>(`/uploads/${id}`);
  }

  public static async createUpload(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadItem>> {
    return apiClient.upload<UploadItem>('/uploads', file, onProgress);
  }

  public static async updateUpload(
    id: string,
    data: UpdateUploadRequest
  ): Promise<ApiResponse<UploadItem>> {
    return apiClient.put<UploadItem>(`/uploads/${id}`, data);
  }

  public static async deleteUpload(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/uploads/${id}`);
  }

  public static async startUpload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/uploads/${id}/start`);
  }

  public static async pauseUpload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/uploads/${id}/pause`);
  }

  public static async resumeUpload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/uploads/${id}/resume`);
  }

  public static async cancelUpload(id: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/uploads/${id}/cancel`);
  }

  public static async getUploadStats(): Promise<ApiResponse<UploadStatsResponse>> {
    return apiClient.get<UploadStatsResponse>('/uploads/stats');
  }

  public static async clearCompleted(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>('/uploads/completed');
  }
}
