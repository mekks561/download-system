import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeFile } from '../utils/serialize';
import type { FileCreateFolder, FileRename, FileMove } from '@dm/shared';

export async function listFiles(userId: number, parentId?: number | null) {
  const rows = await prisma.file.findMany({
    where: { userId, parentId: parentId ?? null },
    orderBy: [{ isDirectory: 'desc' }, { name: 'asc' }],
  });
  return rows.map(serializeFile);
}

export async function createFolder(userId: number, input: FileCreateFolder) {
  const basePath =
    input.parentId === null || input.parentId === undefined
      ? ''
      : (await prisma.file.findFirst({
          where: { id: input.parentId, userId, isDirectory: true },
        }))?.path;
  if (input.parentId !== null && input.parentId !== undefined && basePath === undefined) {
    throw new AppError('NOT_FOUND', 404, '父文件夹不存在');
  }
  const path = basePath ? `${basePath}/${input.name}` : `/${input.name}`;
  const row = await prisma.file.create({
    data: {
      userId,
      name: input.name,
      path,
      type: 'directory',
      isDirectory: true,
      parentId: input.parentId ?? null,
    },
  });
  return serializeFile(row);
}

export async function renameFile(id: number, userId: number, input: FileRename) {
  const existing = await prisma.file.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '文件不存在');
  const row = await prisma.file.update({
    where: { id },
    data: { name: input.name },
  });
  return serializeFile(row);
}

export async function moveFile(id: number, userId: number, input: FileMove) {
  const existing = await prisma.file.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '文件不存在');
  if (input.parentId !== null) {
    const parent = await prisma.file.findFirst({
      where: { id: input.parentId, userId, isDirectory: true },
    });
    if (!parent) throw new AppError('NOT_FOUND', 404, '目标文件夹不存在');
  }
  const row = await prisma.file.update({
    where: { id },
    data: { parentId: input.parentId },
  });
  return serializeFile(row);
}

export async function deleteFile(id: number, userId: number) {
  const existing = await prisma.file.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '文件不存在');
  await prisma.file.delete({ where: { id } });
}

export async function searchFiles(userId: number, query: string) {
  const rows = await prisma.file.findMany({
    where: { userId, name: { contains: query } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeFile);
}
