import OpenAI from 'openai';
import { DownloadItem } from '../types';

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
  private client?: OpenAI;
  private cachedEmbeddings: Map<string, number[]> = new Map();
  private searchCache: Map<string, SearchCacheEntry<SemanticSearchResult[]>> = new Map();
  private rewriteCache: Map<string, SearchCacheEntry<AIQueryRewrite>> = new Map();
  private suggestionCache: Map<string, SearchCacheEntry<AISearchSuggestion[]>> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000;
  private readonly SEARCH_CACHE_KEY_PREFIX = 'ai_search_';
  private readonly REWRITE_CACHE_KEY_PREFIX = 'ai_rewrite_';
  private readonly SUGGESTION_CACHE_KEY_PREFIX = 'ai_suggestion_';

  private constructor() {
    const apiKey = (import.meta.env.VITE_OPENAI_API_KEY ?? '') as string;
    const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL ?? 'https://api.openai.com/v1') as string;

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
      });
    }
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

    if (!this.client) {
      const result = {
        keyword: query,
        filters: {},
        intent: 'search' as const,
        confidence: 0.5,
      };
      this.setCache(this.rewriteCache, cacheKey, result);
      return result;
    }

    try {
      const systemPrompt = `你是一个智能搜索查询解析器。请分析用户输入的自然语言查询，将其转换为结构化的搜索条件。

可用状态: downloading, completed, pending, paused, error
可用类型: image, video, audio, document, archive, software
可用优先级: low, normal, high, urgent

返回JSON格式:
{
  "keyword": "提取的关键词",
  "filters": {
    "type": ["类型列表"],
    "status": ["状态列表"],
    "priority": ["优先级列表"],
    "category": "分类ID或null"
  },
  "intent": "search/filter/sort/recommend",
  "confidence": 0-1之间的数字
}

示例:
用户输入: "最近下载的PDF文档"
输出: {"keyword": "PDF", "filters": {"type": ["document"], "status": ["completed"]}, "intent": "search", "confidence": 0.9}

用户输入: "正在下载的大文件"
输出: {"keyword": "", "filters": {"status": ["downloading"]}, "intent": "filter", "confidence": 0.85}

用户输入: "按大小排序"
输出: {"keyword": "", "filters": {}, "intent": "sort", "confidence": 0.95}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户查询: ${query}` },
        ],
        temperature: 0.1,
        max_tokens: 256,
      });

      const result = response.choices[0]?.message.content || '';

      try {
        const parsed = JSON.parse(result) as AIQueryRewrite;
        this.setCache(this.rewriteCache, cacheKey, parsed);
        return parsed;
      } catch {
        const fallbackResult = {
          keyword: query,
          filters: {},
          intent: 'search' as const,
          confidence: 0.5,
        };
        this.setCache(this.rewriteCache, cacheKey, fallbackResult);
        return fallbackResult;
      }
    } catch {
      const fallbackResult = {
        keyword: query,
        filters: {},
        intent: 'search' as const,
        confidence: 0.5,
      };
      this.setCache(this.rewriteCache, cacheKey, fallbackResult);
      return fallbackResult;
    }
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

    if (!this.client || items.length === 0) {
      const result = this.fallbackSearch(query, items, topK);
      this.setCache(this.searchCache, cacheKey, result);
      return result;
    }

    try {
      const systemPrompt = `你是一个智能下载文件搜索助手。请根据用户查询，在提供的文件列表中找到最相关的文件。

文件列表格式: JSON数组，每个元素包含id, filename, url, status, category_id等字段

请分析用户查询意图，并返回最相关的文件列表，按相关性排序。

返回JSON格式:
[
  {
    "id": "文件ID",
    "filename": "文件名",
    "url": "URL或null",
    "score": 0-1之间的相关性分数,
    "matchedField": "匹配的字段名(filename/url/category)",
    "reason": "为什么这个文件与查询相关"
  }
]

评分标准:
- 文件名完全匹配: 0.9-1.0
- 文件名包含关键词: 0.7-0.89
- URL包含关键词: 0.5-0.69
- 类别匹配: 0.4-0.59
- 语义相关: 根据上下文判断`;

      const humanPrompt = `用户查询: ${query}\n\n文件列表: ${JSON.stringify(items.slice(0, 100))}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: humanPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      });

      const result = response.choices[0]?.message.content || '';

      try {
        const parsed = JSON.parse(result) as SemanticSearchResult[];
        const slicedResult = parsed.slice(0, topK);
        this.setCache(this.searchCache, cacheKey, slicedResult);
        return slicedResult;
      } catch {
        const result = this.fallbackSearch(query, items, topK);
        this.setCache(this.searchCache, cacheKey, result);
        return result;
      }
    } catch {
      const result = this.fallbackSearch(query, items, topK);
      this.setCache(this.searchCache, cacheKey, result);
      return result;
    }
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

    if (!this.client) {
      const result = this.generateBasicSuggestions(query, items, history);
      this.setCache(this.suggestionCache, cacheKey, result);
      return result;
    }

    try {
      const systemPrompt = `你是一个智能搜索建议助手。请根据用户当前查询和下载历史，生成相关的搜索建议。

建议类型:
- semantic: 语义相关的查询扩展
- related: 相关文件或类别建议
- history: 基于历史记录的建议
- popular: 热门搜索建议

返回JSON格式:
[
  {
    "id": "唯一ID",
    "query": "建议的搜索词",
    "description": "建议的描述",
    "type": "semantic/related/history/popular",
    "score": 0-1之间的推荐分数
  }
]

要求:
1. 最多返回5个建议
2. 建议应与当前查询相关
3. 分数越高表示越推荐`;

      const recentFiles = items.slice(-30).map(i => i.filename);

      const humanPrompt = `当前查询: ${query}\n\n最近下载的文件: ${JSON.stringify(recentFiles)}\n\n搜索历史: ${JSON.stringify(history)}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: humanPrompt },
        ],
        temperature: 0.4,
        max_tokens: 512,
      });

      const result = response.choices[0]?.message.content || '';

      try {
        const parsed = JSON.parse(result) as AISearchSuggestion[];
        const slicedResult = parsed.slice(0, 5);
        this.setCache(this.suggestionCache, cacheKey, slicedResult);
        return slicedResult;
      } catch {
        const result = this.generateBasicSuggestions(query, items, history);
        this.setCache(this.suggestionCache, cacheKey, result);
        return result;
      }
    } catch {
      const result = this.generateBasicSuggestions(query, items, history);
      this.setCache(this.suggestionCache, cacheKey, result);
      return result;
    }
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