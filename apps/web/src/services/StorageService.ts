import type { StorageListing } from '@dm/shared';
import { api } from './api';

/**
 * 服务端目录浏览（下载目录选择器的数据源）。
 *
 * 浏览器无法调起系统目录选择框，也拿不到服务端路径；下载管理器跑在服务器/NAS 上，
 * 「下载目录」必然是服务端路径，所以选择目录这件事只能由后端列目录、前端逐层点。
 * 浏览范围由后端限制在 `DM_DOWNLOAD_ROOT` 内（越界返回 403），前端不做路径合法性判断。
 *
 * 走 `services/api.ts`：它带契约校验、自动解包信封、并在失败时抛出后端的中文
 * `error.message`（例如「该目录不可写，请换一个目录」），可直接展示给用户。
 */
export const StorageService = {
  /** 列出某个目录的子目录；不传 path 表示下载根目录 */
  async listDirectories(path?: string): Promise<StorageListing> {
    const data = await api.get<StorageListing>('/fs/dirs', {
      params: path ? { path } : undefined,
    });
    // 响应拦截器运行时已解包为业务数据，类型仍是 AxiosResponse，故双重断言
    return data as unknown as StorageListing;
  },
};
