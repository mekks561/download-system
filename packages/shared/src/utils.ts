/**
 * 下载协议检测工具
 */

export type Protocol = 'http' | 'magnet' | 'torrent';

/**
 * 根据 URL 检测下载协议
 */
export function detectProtocol(url: string): Protocol {
  const normalized = url.trim().toLowerCase();
  
  if (normalized.startsWith('magnet:?')) {
    return 'magnet';
  }
  
  if (normalized.endsWith('.torrent') || normalized.includes('.torrent?') || normalized.startsWith('data:application/x-bittorrent;base64,')) {
    return 'torrent';
  }
  
  return 'http'; // 默认为 http (包含 https)
}

/**
 * 是否是 BT 相关的协议
 */
export function isBtProtocol(protocol: Protocol): boolean {
  return protocol === 'magnet' || protocol === 'torrent';
}
