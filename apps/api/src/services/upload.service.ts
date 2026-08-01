import { prisma } from '../config/prisma';
import { AppError } from '../utils/errors';
import { serializeUpload } from '../utils/serialize';

export async function listUploads(userId: number) {
  const rows = await prisma.upload.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeUpload);
}

export async function getUpload(id: number, userId: number) {
  const row = await prisma.upload.findFirst({ where: { id, userId } });
  if (!row) throw new AppError('NOT_FOUND', 404, '上传记录不存在');
  return serializeUpload(row);
}

export async function deleteUpload(id: number, userId: number) {
  const existing = await prisma.upload.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('NOT_FOUND', 404, '上传记录不存在');
  await prisma.upload.delete({ where: { id } });
}
