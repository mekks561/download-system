import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/ai.controller';

const router = Router();

// AI 端点调用外部 LLM，成本高，单独收紧限流：20 次/分钟/IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'AI 请求过于频繁，请稍后再试' },
    timestamp: new Date().toISOString(),
  },
});

const filenameSchema = z.string().min(1).max(512);
const shortTextSchema = z.string().min(1).max(512);
const searchItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    filename: z.string().max(512).optional(),
    url: z.string().max(2048).optional(),
    status: z.string().max(32).optional(),
    category_id: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

router.use(auth);
router.use(aiLimiter);

router.post(
  '/classify',
  validate(z.object({ filename: filenameSchema, url: z.string().max(2048).optional() })),
  ctrl.classify,
);

router.post(
  '/rewrite-query',
  validate(z.object({ query: shortTextSchema })),
  ctrl.rewriteQuery,
);

router.post(
  '/semantic-search',
  validate(
    z.object({
      query: shortTextSchema,
      items: z.array(searchItemSchema).max(200),
      topK: z.number().int().min(1).max(50).optional(),
    }),
  ),
  ctrl.semanticSearch,
);

router.post(
  '/search-suggestions',
  validate(
    z.object({
      query: z.string().max(512).default(''),
      recentFiles: z.array(z.string().max(512)).max(50).optional(),
      history: z.array(z.string().max(512)).max(50).optional(),
    }),
  ),
  ctrl.searchSuggestions,
);

router.post(
  '/recommendations',
  validate(
    z.object({
      items: z.array(searchItemSchema).max(100),
    }),
  ),
  ctrl.recommendations,
);

export default router;
