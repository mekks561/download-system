import { z } from 'zod';

export const FileSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(512),
  type: z.string().min(1).max(50),
  size: z.number().int().nonnegative(),
  isDirectory: z.boolean(),
  parentId: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type File = z.infer<typeof FileSchema>;

export const FileCreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.number().int().positive().nullable(),
});
export type FileCreateFolder = z.infer<typeof FileCreateFolderSchema>;

export const FileRenameSchema = z.object({
  name: z.string().min(1).max(255),
});
export type FileRename = z.infer<typeof FileRenameSchema>;

export const FileMoveSchema = z.object({
  parentId: z.number().int().positive().nullable(),
});
export type FileMove = z.infer<typeof FileMoveSchema>;
