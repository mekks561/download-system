import OpenAI from 'openai';

/**
 * AI 代理服务：OpenAI Key 只存在服务端环境变量中，
 * 前端通过 /api/ai 下的认证端点间接调用，绝不接触密钥。
 */

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TIMEOUT_MS = 30_000;

let client: OpenAI | null | undefined;

function getClient(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  client = apiKey
    ? new OpenAI({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        timeout: TIMEOUT_MS,
        maxRetries: 1,
      })
    : null;
  return client;
}

export function isAiConfigured(): boolean {
  return getClient() !== null;
}

/** 发起一次 chat 补全；未配置 Key 或调用失败时返回 null，由调用方决定降级策略 */
async function chat(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature: number; maxTokens: number },
): Promise<string | null> {
  const openai = getClient();
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    });
    return response.choices[0]?.message?.content ?? null;
  } catch {
    // 网络/配额/鉴权失败一律静默降级，不向前端泄露内部细节
    return null;
  }
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------- 文件分类 ----------

export interface ClassificationPayload {
  categoryId: string;
  priority: string;
  confidence: number;
  reason: string;
}

const CLASSIFY_PROMPT = `你是一个智能文件分类助手。请根据文件名和URL分析文件类型，并返回分类结果。

可用分类：
- documents: 文档类（PDF, DOC, XLS, PPT, TXT等）
- images: 图片类（JPG, PNG, GIF, SVG等）
- videos: 视频类（MP4, MOV, AVI, MKV等）
- audio: 音频类（MP3, WAV, FLAC等）
- software: 软件类（EXE, DMG, APK, ZIP安装包等）
- archives: 压缩包类（ZIP, RAR, 7Z, TAR等）
- other: 其他类型

请分析以下文件并返回JSON格式：
{
  "category": "分类ID",
  "priority": "low/normal/high/urgent",
  "confidence": 0-1之间的数字,
  "reason": "分类理由"
}

优先级判断规则：
- urgent: 文件名称包含"紧急"、"重要"、"必须"等关键词，或URL包含重要域名
- high: 文档、工作相关文件
- normal: 一般文件
- low: 娱乐、休闲类文件`;

export async function classifyFile(
  filename: string,
  url?: string,
): Promise<ClassificationPayload | null> {
  const raw = await chat(
    CLASSIFY_PROMPT,
    `文件名: ${filename}\nURL: ${url || '未知'}`,
    { temperature: 0.3, maxTokens: 512 },
  );
  const parsed = safeJsonParse<{
    category?: string;
    priority?: string;
    confidence?: number;
    reason?: string;
  }>(raw);
  if (!parsed) return null;
  return {
    categoryId: parsed.category ?? 'other',
    priority: parsed.priority ?? 'normal',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
    reason: parsed.reason ?? 'AI分析结果',
  };
}

// ---------- 查询改写 ----------

export interface QueryRewritePayload {
  keyword: string;
  filters: {
    type?: string[];
    status?: string[];
    priority?: string[];
    category?: string;
  };
  intent: string;
  confidence: number;
}

const REWRITE_PROMPT = `你是一个智能搜索查询解析器。请分析用户输入的自然语言查询，将其转换为结构化的搜索条件。

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

export async function rewriteQuery(query: string): Promise<QueryRewritePayload | null> {
  const raw = await chat(REWRITE_PROMPT, `用户查询: ${query}`, {
    temperature: 0.1,
    maxTokens: 256,
  });
  return safeJsonParse<QueryRewritePayload>(raw);
}

// ---------- 语义搜索 ----------

export interface SemanticHitPayload {
  id: string;
  filename: string;
  url?: string | null;
  score: number;
  matchedField: string;
  reason: string;
}

const SEMANTIC_SEARCH_PROMPT = `你是一个智能下载文件搜索助手。请根据用户查询，在提供的文件列表中找到最相关的文件。

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

export async function semanticSearch(
  query: string,
  items: unknown[],
  topK: number,
): Promise<SemanticHitPayload[] | null> {
  const raw = await chat(
    SEMANTIC_SEARCH_PROMPT,
    `用户查询: ${query}\n\n文件列表: ${JSON.stringify(items.slice(0, 100))}`,
    { temperature: 0.2, maxTokens: 1024 },
  );
  const parsed = safeJsonParse<SemanticHitPayload[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;
  return parsed.slice(0, topK);
}

// ---------- 搜索建议 ----------

export interface SearchSuggestionPayload {
  id: string;
  query: string;
  description: string;
  type: string;
  score: number;
}

const SUGGESTION_PROMPT = `你是一个智能搜索建议助手。请根据用户当前查询和下载历史，生成相关的搜索建议。

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

export async function searchSuggestions(
  query: string,
  recentFiles: string[],
  history: string[],
): Promise<SearchSuggestionPayload[] | null> {
  const raw = await chat(
    SUGGESTION_PROMPT,
    `当前查询: ${query}\n\n最近下载的文件: ${JSON.stringify(recentFiles)}\n\n搜索历史: ${JSON.stringify(history)}`,
    { temperature: 0.4, maxTokens: 512 },
  );
  const parsed = safeJsonParse<SearchSuggestionPayload[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;
  return parsed.slice(0, 5);
}

// ---------- 下载建议 ----------

export interface AiSuggestionPayload {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
}

const RECOMMENDATION_PROMPT = `你是一个智能下载助手。请分析用户的下载历史，提供个性化建议。

返回JSON格式：
[
  {
    "id": "唯一ID",
    "type": "recommendation",
    "title": "建议标题",
    "description": "详细描述",
    "confidence": 0-1之间的数字
  }
]

分析维度：
1. 下载模式识别（时间规律、文件类型偏好）
2. 优化建议（批量下载、网络时段选择）
3. 潜在需求（相关文件推荐、存储空间管理）`;

export async function generateRecommendations(
  recentItems: unknown[],
): Promise<AiSuggestionPayload[] | null> {
  const raw = await chat(
    RECOMMENDATION_PROMPT,
    `用户最近下载记录：${JSON.stringify(recentItems)}`,
    { temperature: 0.3, maxTokens: 512 },
  );
  const parsed = safeJsonParse<AiSuggestionPayload[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;
  return parsed;
}
