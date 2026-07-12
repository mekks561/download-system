import apiClient from './ApiClient';

export interface ExportData {
  version: string;
  exportDate: string;
  userId: number;
  data: {
    downloads: any[];
    uploads: any[];
    tags: any[];
    fileTags: any[];
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
          const data = JSON.parse(reader.result as string);
          const response = await apiClient.post<ImportResponse>('/import', data);
          resolve(response.data as ImportResponse);
        } catch (error) {
          reject({ success: false, message: '解析文件失败' });
        }
      };
      
      reader.onerror = () => {
        reject({ success: false, message: '读取文件失败' });
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
