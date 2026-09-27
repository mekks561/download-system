import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/ai.service';

function ok(res: Response, data: unknown) {
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
}

/** data 为 null 表示后端未配置 AI Key，前端应走本地降级逻辑 */
export const classify = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename, url } = req.body as { filename: string; url?: string };
  const result = await service.classifyFile(filename, url);
  ok(res, { configured: service.isAiConfigured(), result });
});

export const rewriteQuery = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { query } = req.body as { query: string };
  const result = await service.rewriteQuery(query);
  ok(res, { configured: service.isAiConfigured(), result });
});

export const semanticSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { query, items, topK } = req.body as {
    query: string;
    items: unknown[];
    topK?: number;
  };
  const result = await service.semanticSearch(query, items, topK ?? 10);
  ok(res, { configured: service.isAiConfigured(), result });
});

export const searchSuggestions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { query, recentFiles, history } = req.body as {
    query: string;
    recentFiles?: string[];
    history?: string[];
  };
  const result = await service.searchSuggestions(
    query,
    recentFiles ?? [],
    history ?? [],
  );
  ok(res, { configured: service.isAiConfigured(), result });
});

export const recommendations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: unknown[] };
  const result = await service.generateRecommendations(items);
  ok(res, { configured: service.isAiConfigured(), result });
});
