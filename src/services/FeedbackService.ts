import { notification, NotificationOptions } from '../components/ui/Notification';
import { useToast } from '../components/Toast';
import { useCallback } from 'react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackOptions {
  title?: string;
  message: string;
  description?: string;
  duration?: number;
  type?: FeedbackType;
}

export class FeedbackService {
  private static instance: FeedbackService;

  private constructor() {}

  public static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  public success(options: Omit<FeedbackOptions, 'type'>): string {
    return this.show({ ...options, type: 'success' });
  }

  public error(options: Omit<FeedbackOptions, 'type'>): string {
    return this.show({ ...options, type: 'error' });
  }

  public warning(options: Omit<FeedbackOptions, 'type'>): string {
    return this.show({ ...options, type: 'warning' });
  }

  public info(options: Omit<FeedbackOptions, 'type'>): string {
    return this.show({ ...options, type: 'info' });
  }

  public show(options: FeedbackOptions): string {
    const { title, message, description, duration = 4000, type = 'info' } = options;

    const notificationOptions: NotificationOptions = {
      type,
      message: title || message,
      description: description || (title ? message : undefined),
      duration,
    };

    switch (type) {
      case 'success':
        return notification.success(notificationOptions);
      case 'error':
        return notification.error(notificationOptions);
      case 'warning':
        return notification.warning(notificationOptions);
      case 'info':
      default:
        return notification.info(notificationOptions);
    }
  }

  public remove(id: string): void {
    notification.remove(id);
  }
}

export const useFeedback = () => {
  const { showToast } = useToast();

  const success = useCallback((message: string, title?: string, duration?: number) => {
    showToast(title ? `${title}: ${message}` : message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, title?: string, duration?: number) => {
    showToast(title ? `${title}: ${message}` : message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string, duration?: number) => {
    showToast(title ? `${title}: ${message}` : message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, title?: string, duration?: number) => {
    showToast(title ? `${title}: ${message}` : message, 'info', duration);
  }, [showToast]);

  return {
    success,
    error,
    warning,
    info,
  };
};