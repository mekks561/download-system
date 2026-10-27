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
  
  if (normalized.endsWith('.torrent') || normalized.includes('.torrent?')) {
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

/**
 * BT 下线期间的统一提示。webtorrent 依赖 node-datachannel 原生绑定，
 * 当前 alpine 镜像没有可用构建，磁力/种子任务无法真正下载。
 */
export const BT_DISABLED_MESSAGE =
  'BT 下载（磁力链接/种子文件）当前版本暂不可用，请使用 HTTP/HTTPS 直链';
