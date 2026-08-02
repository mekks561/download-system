import { prisma } from '../config/prisma';
import { serializeUser, serializeDownload, serializeUpload } from '../utils/serialize';

export async function getDashboardStats() {
  const [userCount, downloadCount, uploadCount, fileCount] = await Promise.all([
    prisma.user.count(),
    prisma.download.count(),
    prisma.upload.count(),
    prisma.file.count(),
  ]);
  return { userCount, downloadCount, uploadCount, fileCount };
}

export async function listAllUsers() {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeUser);
}

export async function listAllDownloads() {
  const rows = await prisma.download.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    ...serializeDownload(r),
    username: r.user.username,
  }));
}

export async function listAllUploads() {
  const rows = await prisma.upload.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    ...serializeUpload(r),
    username: r.user.username,
  }));
}
