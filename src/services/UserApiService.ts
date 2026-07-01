import { apiClient, ApiResponse } from './ApiClient';
import { User } from './AuthService';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UserProfileResponse {
  user: User;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export class UserApiService {
  public static async login(data: LoginRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    return apiClient.post<{ token: string; user: User }>('/auth/login', data);
  }

  public static async register(data: RegisterRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    return apiClient.post<{ token: string; user: User }>('/auth/register', data);
  }

  public static async getProfile(): Promise<ApiResponse<UserProfileResponse>> {
    return apiClient.get<UserProfileResponse>('/auth/profile');
  }

  public static async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    return apiClient.put<User>('/auth/profile', data);
  }

  public static async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/change-password', data);
  }

  public static async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/logout');
  }
}
