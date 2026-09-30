import { DownloadItem, Priority } from '../types';
import { WorkflowEngine } from './WorkflowEngine';
import { aiPost } from './aiProxy';

export interface FileCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface AISuggestion {
  id: string;
  type: 'category' | 'priority' | 'schedule' | 'recommendation';
  title: string;
  description: string;
  action: () => void;
  confidence: number;
}

export interface ClassificationResult {
  category: FileCategory;
  priority: Priority;
  confidence: number;
  reason: string;
}

export const DEFAULT_CATEGORIES: FileCategory[] = [
  { id: 'documents', name: '文档', icon: 'FileText', color: 'text-blue-500' },
  { id: 'images', name: '图片', icon: 'Image', color: 'text-green-500' },
  { id: 'videos', name: '视频', icon: 'Video', color: 'text-red-500' },
  { id: 'audio', name: '音频', icon: 'Radio', color: 'text-purple-500' },
  { id: 'software', name: '软件', icon: 'Package', color: 'text-orange-500' },
  { id: 'archives', name: '压缩包', icon: 'Archive', color: 'text-gray-500' },
  { id: 'other', name: '其他', icon: 'File', color: 'text-gray-400' },
];

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class AIAssistantService {
  private static instance: AIAssistantService;
  private classificationCache: Map<string, CacheEntry<ClassificationResult>> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;
  private readonly CACHE_KEY_PREFIX = 'ai_classification_';
  private workflowEngine: WorkflowEngine;

  private constructor() {
    this.workflowEngine = WorkflowEngine.getInstance();
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem('ai_assistant_cache');
      if (stored) {
        const cacheData = JSON.parse(stored) as Record<string, { data: ClassificationResult; timestamp: number; ttl: number }>;
        const now = Date.now();
        Object.entries(cacheData).forEach(([key, entry]) => {
          if (now - entry.timestamp < entry.ttl) {
            this.classificationCache.set(key, entry);
          }
        });
      }
    } catch {
      // ignore
    }
  }

  private saveCache(): void {
    try {
      const cacheData: Record<string, { data: ClassificationResult; timestamp: number; ttl: number }> = {};
      this.classificationCache.forEach((entry, key) => {
        cacheData[key] = entry;
      });
      localStorage.setItem('ai_assistant_cache', JSON.stringify(cacheData));
    } catch {
      // ignore
    }
  }

  private getCacheKey(filename: string, url?: string): string {
    return `${this.CACHE_KEY_PREFIX}${filename}_${url || ''}`;
  }

  private getFromCache(key: string): ClassificationResult | null {
    const entry = this.classificationCache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      this.classificationCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: ClassificationResult): void {
    this.classificationCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });
    this.saveCache();
  }

  public static getInstance(): AIAssistantService {
    if (!AIAssistantService.instance) {
      AIAssistantService.instance = new AIAssistantService();
    }
    return AIAssistantService.instance;
  }

  public async classifyFile(filename: string, url?: string): Promise<ClassificationResult> {
    const cacheKey = this.getCacheKey(filename, url);
    const cachedResult = this.getFromCache(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    // 走后端 AI 代理；后端未配置 Key 或调用失败时返回 null，本地降级
    const proxyResult = await aiPost<{
      categoryId: string;
      priority: Priority;
      confidence: number;
      reason: string;
    }>('/ai/classify', { filename, url });

    const aiResult = proxyResult?.result;
    if (aiResult) {
      const classificationResult: ClassificationResult = {
        category: DEFAULT_CATEGORIES.find(c => c.id === aiResult.categoryId) || DEFAULT_CATEGORIES[6],
        priority: aiResult.priority || 'normal',
        confidence: aiResult.confidence || 0.7,
        reason: aiResult.reason || 'AI分析结果',
      };
      this.setCache(cacheKey, classificationResult);
      return classificationResult;
    }

    const result = this.fallbackClassify(filename);
    this.setCache(cacheKey, result);
    return result;
  }

  private fallbackClassify(filename: string): ClassificationResult {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm'];
    const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'];
    const softwareExtensions = ['exe', 'dmg', 'apk', 'msi', 'deb', 'rpm'];
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];

    let category = DEFAULT_CATEGORIES[6];
    let priority: Priority = 'normal';

    if (docExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[0];
      priority = 'high';
    } else if (imageExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[1];
    } else if (videoExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[2];
    } else if (audioExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[3];
    } else if (softwareExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[4];
      priority = 'high';
    } else if (archiveExtensions.includes(extension)) {
      category = DEFAULT_CATEGORIES[5];
    }

    return {
      category,
      priority,
      confidence: 0.8,
      reason: `基于文件扩展名 .${extension} 分类`,
    };
  }

  public suggestDownloadSchedule(items: DownloadItem[]): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    
    const largeFiles = items.filter(i => i.totalBytes > 100 * 1024 * 1024 && i.status === 'pending');
    if (largeFiles.length > 0) {
      suggestions.push({
        id: `suggest_large_${Date.now()}`,
        type: 'schedule',
        title: '大文件建议',
        description: `检测到 ${largeFiles.length} 个大文件待下载，建议在网络空闲时段下载以节省带宽`,
        action: () => {},
        confidence: 0.9,
      });
    }

    const urgentFiles = items.filter(i => i.priority === 'urgent' && i.status === 'pending');
    if (urgentFiles.length > 0) {
      suggestions.push({
        id: `suggest_urgent_${Date.now()}`,
        type: 'priority',
        title: '紧急任务',
        description: `有 ${urgentFiles.length} 个紧急下载任务，请优先处理`,
        action: () => {},
        confidence: 0.95,
      });
    }

    const highPriorityFiles = items.filter(i => i.priority === 'high' && i.status === 'pending');
    if (highPriorityFiles.length > 3) {
      suggestions.push({
        id: `suggest_batch_${Date.now()}`,
        type: 'recommendation',
        title: '批量下载建议',
        description: `检测到多个高优先级文件，建议启用批量下载模式`,
        action: () => {},
        confidence: 0.85,
      });
    }

    if (suggestions.length > 0) {
      void this.workflowEngine.triggerWorkflow('ai_suggestion', { suggestions });
    }

    return suggestions;
  }

  public async generateSmartRecommendations(items: DownloadItem[]): Promise<AISuggestion[]> {
    const recentItems = items.slice(-20).map(i => ({
      filename: i.filename,
      category: i.category_id,
      status: i.status,
    }));

    const proxyResult = await aiPost<
      Array<{ id: string; type: string; title: string; description: string; confidence: number }>
    >('/ai/recommendations', { items: recentItems });

    const parsed = proxyResult?.result;
    if (!parsed || !Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => ({
      id: item.id || `rec_${Date.now()}`,
      type: 'recommendation' as const,
      title: item.title || '',
      description: item.description || '',
      action: () => {},
      confidence: item.confidence || 0.7,
    }));
  }

  public analyzeDownloadPatterns(items: DownloadItem[]): {
    patterns: string[];
    recommendations: string[];
  } {
    const completedItems = items.filter(i => i.status === 'completed');
    
    if (completedItems.length < 5) {
      return {
        patterns: ['下载记录较少，无法识别明显模式'],
        recommendations: ['继续使用下载管理器，积累更多数据后可获得个性化建议'],
      };
    }

    const totalSize = completedItems.reduce((sum, i) => sum + i.totalBytes, 0);
    const avgSize = totalSize / completedItems.length;
    
    const patterns: string[] = [];
    const recommendations: string[] = [];

    if (avgSize > 50 * 1024 * 1024) {
      patterns.push('偏好下载大文件');
      recommendations.push('建议使用断点续传功能，确保下载稳定性');
    } else if (avgSize < 1 * 1024 * 1024) {
      patterns.push('偏好下载小文件');
      recommendations.push('建议启用批量下载模式，提高效率');
    }

    const docCount = completedItems.filter(i => 
      i.filename.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)
    ).length;
    
    if (docCount > completedItems.length * 0.5) {
      patterns.push('主要下载文档类文件');
      recommendations.push('建议使用文档分类功能，便于管理和检索');
    }

    const imageCount = completedItems.filter(i => 
      i.filename.match(/\.(jpg|jpeg|png|gif|svg)$/i)
    ).length;
    
    if (imageCount > completedItems.length * 0.3) {
      patterns.push('经常下载图片文件');
      recommendations.push('建议启用图片预览功能，快速查看下载内容');
    }

    if (patterns.length === 0) {
      patterns.push('下载模式多样化');
      recommendations.push('建议使用分类功能组织不同类型的文件');
    }

    return { patterns, recommendations };
  }
}