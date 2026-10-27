import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = window.dm?.env.apiUrl || (import.meta.env.VITE_API_URL as string | undefined) || '/api';

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
  private csrfToken: string | null = null;
  private isFetchingCsrf = false;
  private csrfSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private async fetchCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (this.isFetchingCsrf) {
      return new Promise((resolve) => {
        this.csrfSubscribers.push(resolve);
      });
    }

    this.isFetchingCsrf = true;
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/csrf-token`, { withCredentials: true });
      this.csrfToken = response.data.data.token;
      this.csrfSubscribers.forEach((callback) => callback(this.csrfToken!));
      this.csrfSubscribers = [];
      return this.csrfToken!;
    } catch (error) {
      console.error('获取 CSRF Token 失败:', error);
      throw error;
    } finally {
      this.isFetchingCsrf = false;
    }
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 非 GET/HEAD/OPTIONS 请求需要注入 CSRF Token
        if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
          try {
            const csrfToken = await this.fetchCsrfToken();
            if (config.headers) {
              config.headers['x-csrf-token'] = csrfToken;
            }
          } catch (e) {
            console.warn('跳过 CSRF Token 注入 (请求可能失败):', e);
          }
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
      const payload = error.response?.data;
      const { message, code } = extractApiError(payload);
      return {
        success: false,
        message: message || error.message,
        error: code || error.message,
      };
    }
    return {
      success: false,
      message: '网络请求失败',
      error: String(error),
    };
  }
}

/**
 * 从后端错误信封中取出可展示的中文信息。
 *
 * 契约信封是 `{ success: false, error: { code, message }, timestamp }`，
 * 即 `error` 是**对象**。历史实现按字符串读 `data.error` / `data.message`，
 * 两者都取不到，于是界面只剩 axios 的 "Request failed with status code 400"，
 * 后端返回的「密码至少 8 个字符」这类原因被静默丢弃。
 *
 * 这里同时兼容旧的字符串写法，避免影响既有调用方。
 */
export function extractApiError(payload: unknown): { message?: string; code?: string } {
  if (typeof payload !== 'object' || payload === null) return {};

  const record = payload as { message?: unknown; error?: unknown };
  const envelope = record.error;

  if (typeof envelope === 'object' && envelope !== null) {
    const detail = envelope as { message?: unknown; code?: unknown };
    return {
      message: typeof detail.message === 'string' ? detail.message : undefined,
      code: typeof detail.code === 'string' ? detail.code : undefined,
    };
  }

  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof envelope === 'string' ? envelope : undefined,
  };
}

export const apiClient = new ApiClient();

export default apiClient;
