import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

type Location = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, location: Location = 'body') =>
    (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req[location]);
      if (!result.success) {
        return next(new AppError('VALIDATION_ERROR', 400, '请求参数校验失败', result.error.flatten()));
      }
      (req as unknown as Record<string, unknown>)[location] = result.data;
      next();
    };
