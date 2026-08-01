/// <reference lib="webworker" />

export {};

interface DownloadMessage {
  type: 'start' | 'pause' | 'cancel';
  id: string;
  url: string;
  resumePosition?: number;
}

let abortController: AbortController | null = null;

self.onmessage = async (e: MessageEvent<DownloadMessage>) => {
  const { type, id, url, resumePosition = 0 } = e.data;

  switch (type) {
    case 'start':
      await downloadFile(id, url, resumePosition);
      break;
    case 'pause':
    case 'cancel':
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      break;
  }
};

async function downloadFile(id: string, url: string, resumePosition: number) {
  abortController = new AbortController();

  try {
    const headers: Record<string, string> = {};
    if (resumePosition > 0) {
      headers['Range'] = `bytes=${resumePosition}-`;
    }

    const response = await fetch(url, {
      signal: abortController.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0') + resumePosition;
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error('无法获取响应体');
    }

    let downloadedBytes = resumePosition;
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      downloadedBytes += value.length;

      const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

      self.postMessage({
        id,
        type: 'progress',
        progress: Math.min(progress, 100),
        downloadedBytes,
        totalBytes,
        status: 'downloading',
      });
    }

    const blob = new Blob(chunks);
    const blobUrl = URL.createObjectURL(blob);

    self.postMessage({
      id,
      type: 'progress',
      progress: 100,
      downloadedBytes,
      totalBytes,
      status: 'completed',
    });

    URL.revokeObjectURL(blobUrl);

  } catch (downloadError) {
    if ((downloadError as Error).name === 'AbortError') {
      self.postMessage({
        id,
        type: 'progress',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: 'cancelled',
      });
    } else {
      self.postMessage({
        id,
        type: 'progress',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: 'error',
        error: (downloadError as Error).message || '下载失败',
      });
    }
  } finally {
    abortController = null;
  }
}