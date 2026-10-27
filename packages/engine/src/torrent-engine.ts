import { BaseEngine } from './base-engine.js';

/**
 * BT 已下线。
 *
 * webtorrent v3 在 import 阶段就会加载 node-datachannel 原生绑定，而当前的
 * alpine(musl) 镜像没有可用的 prebuild、源码编译又缺工具链，所以引擎在这里
 * 只能是个占位。保留类与导出是为了调用方（api / worker）结构稳定，但任何
 * 解析或下载调用都必须立即显式失败，而不是像旧实现那样静默等待到超时。
 */
export const BT_DISABLED_MESSAGE =
  'BT 下载（磁力链接/种子文件）当前版本暂不可用，请使用 HTTP/HTTPS 直链';

export interface TorrentEngineOptions {
  id: number;
  url: string;
  selectedFiles?: number[];
  announce?: string[];
  speedLimit?: number;
}

export class TorrentEngine extends BaseEngine {
  constructor(downloadRoot: string) {
    super(downloadRoot);
  }

  static async parseMetadata(_uri: string | Buffer): Promise<never> {
    throw new Error(BT_DISABLED_MESSAGE);
  }

  async start(_options: TorrentEngineOptions): Promise<never> {
    throw new Error(BT_DISABLED_MESSAGE);
  }

  async pause(): Promise<void> {
    this.emit('paused', { downloadedBytes: 0 });
  }

  async cancel(): Promise<void> {
    this.emit('cancelled');
  }
}
