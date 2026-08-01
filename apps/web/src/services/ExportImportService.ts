import apiClient from './ApiClient';

export interface DownloadRecord {
  id: number;
  url: string;
  filename: string;
  status: string;
  file_size: number;
  created_at: string;
}

export interface UploadRecord {
  id: number;
  filename: string;
  file_size: number;
  created_at: string;
}

export interface TagRecord {
  id: number;
  name: string;
  color: string;
}

export interface FileTagRecord {
  file_id: number;
  tag_id: number;
}

export interface ExportData {
  version: string;
  exportDate: string;
  userId: number;
  data: {
    downloads: DownloadRecord[];
    uploads: UploadRecord[];
    tags: TagRecord[];
    fileTags: FileTagRecord[];
  };
}

export interface ImportResponse {
  success: boolean;
  message: string;
}

export class ExportImportService {
  public static async exportDownloads(): Promise<void> {
    const blob = await apiClient.getBlob('/export/downloads');
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `download-manager-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  public static async exportDownloadsCSV(): Promise<void> {
    const blob = await apiClient.getBlob('/export/downloads/csv');
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downloads-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  public static async importData(file: File): Promise<ImportResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result as string) as ExportData;
          const response = await apiClient.post<ImportResponse>('/import', data);
          resolve(response.data as ImportResponse);
        } catch {
          reject(new Error('解析文件失败'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file);
    });
  }

  public static validateImportFile(file: File): string | null {
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过10MB';
    }
    
    if (!file.name.endsWith('.json')) {
      return '只支持JSON格式文件';
    }
    
    return null;
  }
}
