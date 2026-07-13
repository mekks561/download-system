import { apiClient } from './ApiClient';

export interface SearchFilters {
  q?: string;
  type?: string[];
  status?: string[];
  start?: string;
  end?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface GlobalSearchItem {
  id: number;
  title: string;
  subtitle: string;
  type: 'download' | 'upload' | 'file' | 'share';
  created_at: string;
}

export interface GlobalSearchResult {
  success: boolean;
  data: GlobalSearchItem[];
  counts: {
    downloads: number;
    uploads: number;
    files: number;
    shares: number;
    total: number;
  };
}

export class SearchApiService {
  public static async searchDownloads(filters: SearchFilters): Promise<SearchResult<any>> {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.start) params.set('start', filters.start);
    if (filters.end) params.set('end', filters.end);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const response = await apiClient.get<SearchResult<any>>(`/search/downloads?${params.toString()}`);
    return response.data as SearchResult<any>;
  }

  public static async searchUploads(filters: SearchFilters): Promise<SearchResult<any>> {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.start) params.set('start', filters.start);
    if (filters.end) params.set('end', filters.end);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const response = await apiClient.get<SearchResult<any>>(`/search/uploads?${params.toString()}`);
    return response.data as SearchResult<any>;
  }

  public static async searchFiles(filters: SearchFilters): Promise<SearchResult<any>> {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.start) params.set('start', filters.start);
    if (filters.end) params.set('end', filters.end);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));

    const response = await apiClient.get<SearchResult<any>>(`/search/files?${params.toString()}`);
    return response.data as SearchResult<any>;
  }

  public static async globalSearch(q: string, limit: number = 20): Promise<GlobalSearchResult> {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('limit', String(limit));

    const response = await apiClient.get<GlobalSearchResult>(`/search?${params.toString()}`);
    return response.data as GlobalSearchResult;
  }
}