import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export interface DownloadProgressEvent {
  downloadId: number;
  progress: number;
  status: string;
}

export interface DownloadCompleteEvent {
  downloadId: number;
  filename: string;
}

export interface DownloadFailedEvent {
  downloadId: number;
  error: string;
}

export interface UploadProgressEvent {
  uploadId: number;
  progress: number;
  status: string;
}

export interface UploadCompleteEvent {
  uploadId: number;
  filename: string;
}

export interface UploadFailedEvent {
  uploadId: number;
  error: string;
}

export interface SystemNotificationEvent {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private static instance: SocketService | null = null;
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnected = false;

  private downloadProgressCallbacks: Set<EventCallback<DownloadProgressEvent>> = new Set();
  private downloadCompleteCallbacks: Set<EventCallback<DownloadCompleteEvent>> = new Set();
  private downloadFailedCallbacks: Set<EventCallback<DownloadFailedEvent>> = new Set();
  private uploadProgressCallbacks: Set<EventCallback<UploadProgressEvent>> = new Set();
  private uploadCompleteCallbacks: Set<EventCallback<UploadCompleteEvent>> = new Set();
  private uploadFailedCallbacks: Set<EventCallback<UploadFailedEvent>> = new Set();
  private systemNotificationCallbacks: Set<EventCallback<SystemNotificationEvent>> = new Set();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(token: string): void {
    if (this.socket && this.isConnected) {
      return;
    }

    this.token = token;
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('downloadProgress', (data: DownloadProgressEvent) => {
      this.downloadProgressCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('downloadComplete', (data: DownloadCompleteEvent) => {
      this.downloadCompleteCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('downloadFailed', (data: DownloadFailedEvent) => {
      this.downloadFailedCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('uploadProgress', (data: UploadProgressEvent) => {
      this.uploadProgressCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('uploadComplete', (data: UploadCompleteEvent) => {
      this.uploadCompleteCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('uploadFailed', (data: UploadFailedEvent) => {
      this.uploadFailedCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('systemNotification', (data: SystemNotificationEvent) => {
      this.systemNotificationCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  onDownloadProgress(callback: EventCallback<DownloadProgressEvent>): () => void {
    this.downloadProgressCallbacks.add(callback);
    return () => this.downloadProgressCallbacks.delete(callback);
  }

  onDownloadComplete(callback: EventCallback<DownloadCompleteEvent>): () => void {
    this.downloadCompleteCallbacks.add(callback);
    return () => this.downloadCompleteCallbacks.delete(callback);
  }

  onDownloadFailed(callback: EventCallback<DownloadFailedEvent>): () => void {
    this.downloadFailedCallbacks.add(callback);
    return () => this.downloadFailedCallbacks.delete(callback);
  }

  onUploadProgress(callback: EventCallback<UploadProgressEvent>): () => void {
    this.uploadProgressCallbacks.add(callback);
    return () => this.uploadProgressCallbacks.delete(callback);
  }

  onUploadComplete(callback: EventCallback<UploadCompleteEvent>): () => void {
    this.uploadCompleteCallbacks.add(callback);
    return () => this.uploadCompleteCallbacks.delete(callback);
  }

  onUploadFailed(callback: EventCallback<UploadFailedEvent>): () => void {
    this.uploadFailedCallbacks.add(callback);
    return () => this.uploadFailedCallbacks.delete(callback);
  }

  onSystemNotification(callback: EventCallback<SystemNotificationEvent>): () => void {
    this.systemNotificationCallbacks.add(callback);
    return () => this.systemNotificationCallbacks.delete(callback);
  }
}

export default SocketService;