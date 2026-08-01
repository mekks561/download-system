import { useState, useCallback } from 'react';
import { ApiResponse } from '../services/ApiClient';

interface ErrorState {
  message: string;
  code?: number;
  timestamp: number;
}

export const useApiError = () => {
  const [errors, setErrors] = useState<ErrorState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleApiResponse = useCallback(async <T>(
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      const response = await apiCall();
      if (response.success && response.data) {
        return response.data;
      }
      if (response.message) {
        const newError: ErrorState = {
          message: response.message,
          timestamp: Date.now(),
        };
        setErrors((prev) => [...prev, newError]);
        setTimeout(() => {
          setErrors((prev) => prev.filter((e) => e.timestamp !== newError.timestamp));
        }, 5000);
      }
      return null;
    } catch {
      const newError: ErrorState = {
        message: '网络请求失败',
        timestamp: Date.now(),
      };
      setErrors((prev) => [...prev, newError]);
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.timestamp !== newError.timestamp));
      }, 5000);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addError = useCallback((message: string, code?: number) => {
    const newError: ErrorState = {
      message,
      code,
      timestamp: Date.now(),
    };
    setErrors((prev) => [...prev, newError]);
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.timestamp !== newError.timestamp));
    }, 5000);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    isLoading,
    handleApiResponse,
    addError,
    clearErrors,
  };
};
