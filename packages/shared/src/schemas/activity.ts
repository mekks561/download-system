import { z } from 'zod';

export const ActivitySchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type Activity = z.infer<typeof ActivitySchema>;
