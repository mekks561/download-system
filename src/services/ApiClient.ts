import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async patch<T = unknown>(
    url: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async delete<T = unknown>(url: string, config?: { data?: unknown }): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async upload<T = unknown>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(percent);
          }
        },
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async getBlob(url: string, params?: Record<string, unknown>): Promise<Blob> {
    const token = localStorage.getItem('token');
    const config: Record<string, unknown> = {
      params,
      responseType: 'blob' as const,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    };

    const response = await this.axiosInstance.get(url, config);
    return response.data as Blob;
  }

  private handleError<T = unknown>(error: unknown): ApiResponse<T> {
    if (axios.isAxiosError<ApiResponse>(error)) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data?.error || error.message,
      };
    }
    return {
      success: false,
      message: '网络请求失败',
      error: String(error),
    };
  }
}

export const apiClient = new ApiClient();

export default apiClient;
