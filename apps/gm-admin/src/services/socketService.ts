import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:5001';

export interface SystemLogEvent {
  taskId?: string | number;
  workerId: string;
  level: string;
  message: string;
  timestamp: string;
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private static instance: SocketService | null = null;
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnected = false;

  private systemLogCallbacks: Set<EventCallback<SystemLogEvent>> = new Set();

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
      console.log('[GM-Socket] Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('[GM-Socket] Disconnected from server');
    });

    this.socket.on('systemLog', (data: SystemLogEvent) => {
      this.systemLogCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('[GM-Socket] Connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  onSystemLog(callback: EventCallback<SystemLogEvent>): () => void {
    this.systemLogCallbacks.add(callback);
    return () => this.systemLogCallbacks.delete(callback);
  }
}

export default SocketService;
