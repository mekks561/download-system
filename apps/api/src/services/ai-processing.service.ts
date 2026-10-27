import { prisma } from '../config/prisma.js';
import * as ai from './ai.service.js';
import { emitSystemNotification } from '../config/socket.js';

/**
 * 后置 AI 处理：当下载完成或资源创建后，异步执行分类与向量化。
 */
export async function processDownloadAi(downloadId: number) {
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
  });

  if (!download) return;

  try {
    // 1. AI 自动分类与优先级判定
    const classification = await ai.classifyFile(download.filename, download.url);
    
    // 2. 生成向量嵌入 (Embedding) 用于语义搜索与去重
    const embedding = await ai.generateEmbedding(download.filename);

    // 3. 更新元数据
    const currentMeta = (download.metadata as any) || {};
    const nextMeta = {
      ...currentMeta,
      aiCategory: classification?.categoryId || 'other',
      aiReason: classification?.reason,
      aiConfidence: classification?.confidence,
      priority: classification?.priority || 'normal',
      embedding: embedding || undefined,
      processedAt: new Date().toISOString(),
    };

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        metadata: nextMeta,
      },
    });

    console.log(`[AI Processing] 任务 #${downloadId} 处理完成: ${nextMeta.aiCategory}`);

    // 如果置信度高且判定为 suspicious，推送告警
    if (classification?.categoryId === 'suspicious' && classification.confidence > 0.8) {
      emitSystemNotification(
        download.userId,
        '安全风险提示',
        `系统检测到下载任务 "${download.filename}" 可能包含风险内容，请谨慎处理。`,
        'warning'
      );
    }
  } catch (err) {
    console.error(`[AI Processing] 任务 #${downloadId} 处理失败:`, err);
  }
}
