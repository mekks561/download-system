import { DownloadItem } from '../types';
import { aiPost } from './aiProxy';

export interface SemanticSearchResult {
  id: string | number;
  filename: string;
  url?: string;
  score: number;
  matchedField: string;
  reason: string;
}

export interface AIQueryRewrite {
  keyword: string;
  filters: {
    type?: string[];
    status?: string[];
    priority?: string[];
    category?: string;
  };
  intent: 'search' | 'filter' | 'sort' | 'recommend';
  confidence: number;
}

export interface AISearchSuggestion {
  id: string;
  query: string;
  description: string;
  type: 'semantic' | 'related' | 'history' | 'popular';
  score: number;
}

interface SearchCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class AISearchService {
  private static instance: AISearchService;
  private cachedEmbeddings: Map<string, number[]> = new Map();
  private searchCache: Map<string, SearchCacheEntry<SemanticSearchResult[]>> = new Map();
  private rewriteCache: Map<string, SearchCacheEntry<AIQueryRewrite>> = new Map();
  private suggestionCache: Map<string, SearchCacheEntry<AISearchSuggestion[]>> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000;
  private readonly SEARCH_CACHE_KEY_PREFIX = 'ai_search_';
  private readonly REWRITE_CACHE_KEY_PREFIX = 'ai_rewrite_';
  private readonly SUGGESTION_CACHE_KEY_PREFIX = 'ai_suggestion_';

  private constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem('ai_search_cache');
      if (stored) {
        const cacheData = JSON.parse(stored) as {
          search?: Record<string, { data: SemanticSearchResult[]; timestamp: number; ttl: number }>;
          rewrite?: Record<string, { data: AIQueryRewrite; timestamp: number; ttl: number }>;
          suggestion?: Record<string, { data: AISearchSuggestion[]; timestamp: number; ttl: number }>;
        };
        const now = Date.now();
        
        if (cacheData.search) {
          Object.entries(cacheData.search).forEach(([key, entry]) => {
            if (now - entry.timestamp < entry.ttl) {
              this.searchCache.set(key, entry);
            }
          });
        }
        if (cacheData.rewrite) {
          Object.entries(cacheData.rewrite).forEach(([key, entry]) => {
            if (now - entry.timestamp < entry.ttl) {
              this.rewriteCache.set(key, entry);
            }
          });
        }
        if (cacheData.suggestion) {
          Object.entries(cacheData.suggestion).forEach(([key, entry]) => {
            if (now - entry.timestamp < entry.ttl) {
              this.suggestionCache.set(key, entry);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  private saveCache(): void {
    try {
      const searchData: Record<string, { data: SemanticSearchResult[]; timestamp: number; ttl: number }> = {};
      const rewriteData: Record<string, { data: AIQueryRewrite; timestamp: number; ttl: number }> = {};
      const suggestionData: Record<string, { data: AISearchSuggestion[]; timestamp: number; ttl: number }> = {};

      this.searchCache.forEach((entry, key) => {
        searchData[key] = entry;
      });
      this.rewriteCache.forEach((entry, key) => {
        rewriteData[key] = entry;
      });
      this.suggestionCache.forEach((entry, key) => {
        suggestionData[key] = entry;
      });

      localStorage.setItem('ai_search_cache', JSON.stringify({
        search: searchData,
        rewrite: rewriteData,
        suggestion: suggestionData,
      }));
    } catch {
      // ignore
    }
  }

  private getFromCache<T>(cache: Map<string, SearchCacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    if (entry) {
      cache.delete(key);
    }
    return null;
  }

  private setCache<T>(cache: Map<string, SearchCacheEntry<T>>, key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });
    this.saveCache();
  }

  public static getInstance(): AISearchService {
    if (!AISearchService.instance) {
      AISearchService.instance = new AISearchService();
    }
    return AISearchService.instance;
  }

  public async rewriteQuery(query: string): Promise<AIQueryRewrite> {
    const cacheKey = `${this.REWRITE_CACHE_KEY_PREFIX}${query}`;
    const cachedResult = this.getFromCache(this.rewriteCache, cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    // 走后端 AI 代理；后端未配置 Key 或调用失败时本地降级
    const proxyResult = await aiPost<AIQueryRewrite>('/ai/rewrite-query', { query });

    const parsed = proxyResult?.result;
    if (parsed) {
      const normalized: AIQueryRewrite = {
        keyword: parsed.keyword ?? query,
        filters: parsed.filters ?? {},
        intent: parsed.intent ?? 'search',
        confidence: parsed.confidence ?? 0.5,
      };
      this.setCache(this.rewriteCache, cacheKey, normalized);
      return normalized;
    }

    const fallbackResult = {
      keyword: query,
      filters: {},
      intent: 'search' as const,
      confidence: 0.5,
    };
    this.setCache(this.rewriteCache, cacheKey, fallbackResult);
    return fallbackResult;
  }

  public async semanticSearch(
    query: string,
    items: DownloadItem[],
    topK: number = 10
  ): Promise<SemanticSearchResult[]> {
    const cacheKey = `${this.SEARCH_CACHE_KEY_PREFIX}${query}_${items.length}`;
    const cachedResult = this.getFromCache(this.searchCache, cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    if (items.length === 0) {
      const result = this.fallbackSearch(query, items, topK);
      this.setCache(this.searchCache, cacheKey, result);
      return result;
    }

    // 走后端 AI 代理；后端未配置 Key 或调用失败时本地降级
    const proxyResult = await aiPost<SemanticSearchResult[]>('/ai/semantic-search', {
      query,
      items: items.slice(0, 100).map(i => ({
        id: i.id,
        filename: i.filename,
        url: i.url,
        status: i.status,
        category_id: i.category_id,
      })),
      topK,
    });

    const parsed = proxyResult?.result;
    if (parsed && Array.isArray(parsed)) {
      const slicedResult = parsed.slice(0, topK);
      this.setCache(this.searchCache, cacheKey, slicedResult);
      return slicedResult;
    }

    const result = this.fallbackSearch(query, items, topK);
    this.setCache(this.searchCache, cacheKey, result);
    return result;
  }

  private fallbackSearch(query: string, items: DownloadItem[], topK: number): SemanticSearchResult[] {
    const lowerQuery = query.toLowerCase();

    return items
      .map(item => {
        let score = 0;
        let matchedField = 'filename';
        let reason = '';

        if (item.filename.toLowerCase().includes(lowerQuery)) {
          const matchLength = lowerQuery.length;
          const filenameLength = item.filename.length;
          score = Math.min(0.9, 0.5 + (matchLength / filenameLength) * 0.4);
          matchedField = 'filename';
          reason = `文件名包含 "${query}"`;
        } else if (item.url && item.url.toLowerCase().includes(lowerQuery)) {
          score = 0.55;
          matchedField = 'url';
          reason = `URL包含 "${query}"`;
        }

        return {
          id: item.id || '',
          filename: item.filename,
          url: item.url,
          score,
          matchedField,
          reason,
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public async generateSearchSuggestions(
    query: string,
    items: DownloadItem[],
    history: string[] = []
  ): Promise<AISearchSuggestion[]> {
    const cacheKey = `${this.SUGGESTION_CACHE_KEY_PREFIX}${query}_${items.length}_${history.length}`;
    const cachedResult = this.getFromCache(this.suggestionCache, cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    // 走后端 AI 代理；后端未配置 Key 或调用失败时本地降级
    const recentFiles = items.slice(-30).map(i => i.filename);
    const proxyResult = await aiPost<AISearchSuggestion[]>('/ai/search-suggestions', {
      query,
      recentFiles,
      history,
    });

    const parsed = proxyResult?.result;
    if (parsed && Array.isArray(parsed)) {
      const slicedResult = parsed.slice(0, 5);
      this.setCache(this.suggestionCache, cacheKey, slicedResult);
      return slicedResult;
    }

    const result = this.generateBasicSuggestions(query, items, history);
    this.setCache(this.suggestionCache, cacheKey, result);
    return result;
  }

  private generateBasicSuggestions(
    query: string,
    items: DownloadItem[],
    history: string[]
  ): AISearchSuggestion[] {
    const suggestions: AISearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    history
      .filter(h => h.toLowerCase().includes(lowerQuery) && h !== query)
      .slice(0, 2)
      .forEach(h => {
        suggestions.push({
          id: `history_${h}`,
          query: h,
          description: `历史搜索: ${h}`,
          type: 'history',
          score: 0.7,
        });
      });

    const filenameSet = new Set<string>();
    items.forEach(item => {
      if (item.filename.toLowerCase().includes(lowerQuery) && !filenameSet.has(item.filename)) {
        filenameSet.add(item.filename);
      }
    });

    Array.from(filenameSet).slice(0, 2).forEach(fn => {
      suggestions.push({
        id: `related_${fn}`,
        query: fn,
        description: `相关文件: ${fn}`,
        type: 'related',
        score: 0.6,
      });
    });

    if (!query) {
      const typeSuggestions = [
        { type: 'document', query: '文档', desc: '搜索文档文件' },
        { type: 'image', query: '图片', desc: '搜索图片文件' },
        { type: 'video', query: '视频', desc: '搜索视频文件' },
      ];
      typeSuggestions.forEach(s => {
        suggestions.push({
          id: `popular_${s.type}`,
          query: s.query,
          description: s.desc,
          type: 'popular',
          score: 0.5,
        });
      });
    }

    return suggestions.slice(0, 5);
  }

  public async enhancedSearch(
    query: string,
    items: DownloadItem[],
    history: string[] = []
  ): Promise<{
    results: SemanticSearchResult[];
    suggestions: AISearchSuggestion[];
    queryRewrite: AIQueryRewrite;
  }> {
    const [rewrite, results, suggestions] = await Promise.all([
      this.rewriteQuery(query),
      this.semanticSearch(query, items),
      this.generateSearchSuggestions(query, items, history),
    ]);

    return {
      results,
      suggestions,
      queryRewrite: rewrite,
    };
  }
}