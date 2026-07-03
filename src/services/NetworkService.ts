import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface NetworkConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  maxConcurrentRequests: number;
  connectionPoolSize: number;
}

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RequestTask {
  id: string;
  options: RequestOptions;
  promise: Promise<AxiosResponse>;
  abortController: AbortController;
}

export class NetworkService {
  private static instance: NetworkService;
  private activeRequests: number = 0;
  private requestQueue: RequestTask[] = [];
  private abortControllers: Map<string, AbortController> = new Map();
  private config: NetworkConfig = {
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 2000,
    maxConcurrentRequests: 5,
    connectionPoolSize: 10,
  };

  private constructor() {}

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  public setConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): NetworkConfig {
    return { ...this.config };
  }

  public async request<T = unknown>(options: RequestOptions): Promise<AxiosResponse<T>> {
    const id = this.generateId();
    const abortController = new AbortController();
    this.abortControllers.set(id, abortController);

    const task: RequestTask = {
      id,
      options,
      promise: this.executeRequest<T>(options, abortController, id),
      abortController,
    };

    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      this.requestQueue.push(task);
    } else {
      void this.executeNext(task);
    }

    try {
      return await task.promise;
    } finally {
      this.abortControllers.delete(id);
    }
  }

  private async executeRequest<T>(
    options: RequestOptions,
    abortController: AbortController,
    _id: string
  ): Promise<AxiosResponse<T>> {
    const {
      url,
      method = 'GET',
      headers = {},
      responseType = 'json',
      timeout = this.config.timeout,
      maxRetries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
    } = options;

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      responseType,
      timeout,
      signal: abortController.signal,
    };

    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
      try {
        const response = await axios<T>(config);
        return response;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ERR_CANCELED') {
            throw error;
          }

          if (retryCount >= maxRetries || !this.shouldRetry(error)) {
            throw error;
          }
        } else {
          throw error;
        }

        const delay = retryDelay * Math.pow(2, retryCount);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async executeNext(task: RequestTask): Promise<void> {
    this.activeRequests++;
    try {
      await task.promise;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.activeRequests < this.config.maxConcurrentRequests && this.requestQueue.length > 0) {
      const nextTask = this.requestQueue.shift();
      if (nextTask) {
        void this.executeNext(nextTask);
      }
    }
  }

  private shouldRetry(error: AxiosError): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_TIMED_OUT',
      'EAI_AGAIN',
      'ECONNREFUSED',
    ];

    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    if (error.response) {
      const status = error.response.status;
      if (status >= 500 || status === 408 || status === 429) {
        return true;
      }
    }

    return false;
  }

  public abort(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  public abortAll(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.requestQueue = [];
  }

  public getActiveRequestCount(): number {
    return this.activeRequests;
  }

  public getQueueSize(): number {
    return this.requestQueue.length;
  }

  private generateId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async get<T = unknown>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<AxiosResponse<T>> {
    return this.request<T>({ url, method: 'GET', ...options });
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: Omit<RequestOptions, 'url' | 'method'>
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ url, method: 'POST', ...options });
  }

  public async head(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<AxiosResponse> {
    return this.request({ url, method: 'HEAD', ...options });
  }

  public async checkUrlAvailability(url: string): Promise<{ available: boolean; status?: number; message?: string }> {
    try {
      const response = await this.head(url, { timeout: 10000 });
      return {
        available: true,
        status: response.status,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return {
          available: false,
          status: error.response?.status,
          message: error.message,
        };
      }
      return {
        available: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async checkResumeSupport(url: string): Promise<boolean> {
    try {
      const response = await this.head(url, { timeout: 10000 });
      const acceptRanges = response.headers['accept-ranges'] as string | undefined;
      return acceptRanges === 'bytes';
    } catch {
      return false;
    }
  }
}