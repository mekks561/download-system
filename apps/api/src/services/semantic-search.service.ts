import { prisma } from '../config/prisma.js';
import * as aiService from './ai.service.js';

/**
 * 向量语义搜索服务 (Industrialization 2.0)
 * 负责维护任务的向量嵌入，并提供语义检索能力
 */
export class SemanticSearchService {
  private static instance: SemanticSearchService;
  private isIndexing = false;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new SemanticSearchService();
    }
    return this.instance;
  }

  /**
   * 启动后台索引任务
   * 扫描所有已完成但未生成 Embedding 的任务
   */
  async startIndexing() {
    if (this.isIndexing) return;
    this.isIndexing = true;
    console.log('[SemanticSearch] Background indexing started...');

    try {
      // 找出所有已完成但元数据中没有 embedding 的任务。
      // 注意：Prisma 对 Json 字段的 path 数组过滤仅 PostgreSQL 支持，
      // MySQL/MariaDB 下会抛 PrismaClientValidationError，这里在内存中过滤。
      const candidates = await prisma.download.findMany({
        where: { status: 'completed' },
        take: 200
      });
      const tasks = candidates
        .filter(t => !((t.metadata as Record<string, unknown> | null)?.embedding))
        .slice(0, 50); // 每次处理 50 条，防止超限

      console.log(`[SemanticSearch] Found ${tasks.length} tasks needing embedding`);

      for (const task of tasks) {
        const text = `${task.filename} ${task.url}`;
        const embedding = await aiService.generateEmbedding(text);
        
        if (embedding) {
          const metadata = (task.metadata as any) || {};
          await prisma.download.update({
            where: { id: task.id },
            data: {
              metadata: {
                ...metadata,
                embedding
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('[SemanticSearch] Indexing error:', err);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * 执行语义搜索
   */
  async search(query: string, userId: number, topK = 10) {
    // 工业化 2.0 优化: 仅拉取已生成 Embedding 的数据进行向量计算
    const all = await prisma.download.findMany({
      where: {
        userId,
        status: 'completed'
      }
    });
    // MariaDB 不支持 Prisma 的 Json path 数组过滤，内存筛选已有 embedding 的条目
    const items = all.filter(
      t => Array.isArray(((t.metadata as Record<string, unknown> | null)?.embedding))
    );

    // 如果没有数据，返回空
    if (items.length === 0) return [];

    // 调用 AI Service 执行向量搜索
    const hits = await aiService.vectorSearch(query, items, topK);
    return hits || [];
  }

  /**
   * 全局语义搜索 (GM 使用)
   */
  async globalSearch(query: string, topK = 20) {
    // 工业化 2.0 优化: 仅拉取已生成 Embedding 的数据
    const all = await prisma.download.findMany({
      where: { status: 'completed' }
    });
    const items = all.filter(
      t => Array.isArray(((t.metadata as Record<string, unknown> | null)?.embedding))
    );

    const hits = await aiService.vectorSearch(query, items, topK);
    return hits || [];
  }
}

export const semanticSearchService = SemanticSearchService.getInstance();
