import { z } from 'zod';
import { UploadStatus } from '../enums';

export const UploadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  filePath: z.string().min(1).max(512),
  status: UploadStatus,
  progress: z.number().min(0).max(100),
  uploadedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Upload = z.infer<typeof UploadSchema>;
