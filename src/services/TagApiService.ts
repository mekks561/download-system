import { apiClient, ApiResponse } from './ApiClient';

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  description: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface AddTagsToFileRequest {
  tagIds: number[];
}

export interface SearchByTagResponse {
  success: boolean;
  data: {
    file_id: number;
    file_type: string;
    filename: string;
    path: string;
    status: string;
    created_at: string;
  }[];
  total: number;
  limit: number;
  offset: number;
}

export class TagApiService {
  public static async getTags(): Promise<ApiResponse<Tag[]>> {
    return apiClient.get<Tag[]>('/tags');
  }

  public static async getTagById(id: number): Promise<ApiResponse<Tag>> {
    return apiClient.get<Tag>(`/tags/${id}`);
  }

  public static async createTag(data: CreateTagRequest): Promise<ApiResponse<Tag>> {
    return apiClient.post<Tag>('/tags', data);
  }

  public static async updateTag(id: number, data: UpdateTagRequest): Promise<ApiResponse<Tag>> {
    return apiClient.put<Tag>(`/tags/${id}`, data);
  }

  public static async deleteTag(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/tags/${id}`);
  }

  public static async getFileTags(fileId: number, fileType: string): Promise<ApiResponse<Tag[]>> {
    return apiClient.get<Tag[]>(`/tags/${fileId}/${fileType}`);
  }

  public static async addTagsToFile(
    fileId: number,
    fileType: string,
    data: AddTagsToFileRequest
  ): Promise<ApiResponse<Tag[]>> {
    return apiClient.post<Tag[]>(`/tags/${fileId}/${fileType}/add`, data);
  }

  public static async removeTagsFromFile(
    fileId: number,
    fileType: string,
    data: AddTagsToFileRequest
  ): Promise<ApiResponse<Tag[]>> {
    return apiClient.post<Tag[]>(`/tags/${fileId}/${fileType}/remove`, data);
  }

  public static async searchByTag(
    tagId: number,
    fileType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SearchByTagResponse> {
    const params: Record<string, string | number> = { tagId, limit, offset };
    if (fileType) params.fileType = fileType;
    const response = await apiClient.get<SearchByTagResponse>('/tags/search', params);
    return response.data as SearchByTagResponse;
  }
}