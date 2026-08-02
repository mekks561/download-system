import type { Response } from 'express';
import { z } from 'zod';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';

// eslint-disable-next-line @typescript-eslint/require-await -- async 保证返回 Promise 以匹配 asyncHandler 类型签名
export const check = asyncHandler(async (_req, res: Response) => {
  res.json(
    ApiSuccessSchema(z.unknown()).parse({
      success: true,
      data: { status: 'ok', timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    }),
  );
});
