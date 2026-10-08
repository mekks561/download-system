# RFC-03：权限模型

- **状态**：Accepted
- **版本**：v3.1.0
- **日期**：2026-08-26
- **上游依据**：spec §6.3（权限模型）；实现对应 plan Task 3（permissions.ts）与 Task 10（PluginHost 权限门控）
- **系列文档**：`01-architecture.md` → `02-sandbox.md` → 03 权限（本篇）→ `04-lifecycle.md` → `05-marketplace.md`

## 1. 背景

沙箱（`02-sandbox.md`）解决「插件崩了不拖垮宿主」，权限模型解决「插件能做什么」。设计原则：**安装时全量声明、用户显式授权、运行时按白名单强制**。插件未声明的能力一律不可用，不存在「先跑起来再要权限」的隐式提权路径。

## 2. 目标 / 非目标

### 2.1 目标

- 定义 6 类声明式权限，覆盖插件的典型能力面（网络 / 文件 / 环境变量 / 子进程 / UI 注入 / 宿主 API）。
- manifest 即权限清单：用户在安装时看到的就是插件能用的全部能力。
- 提供一组纯函数判定助手，供宿主在各强制点（enforcement point）调用。

### 2.2 非目标

- 运行时动态权限申请（如 UI 插件运行中弹窗申请 fs 权限）：v3.1.0 全部权限必须安装时声明，动态申请列入未来迭代。
- 细粒度到「单个 API 参数级别」的约束（如限制 `endpoints` 的 query）：当前只到路径/域名粒度。
- 权限的撤销与再授权 UI：v3.1.0 通过卸载/重装实现。

## 3. 六类权限

类型定义位于 `packages/plugin-sdk/src/permissions.ts`（本迭代新增）：

```typescript
export type Permission =
  | { type: 'network'; hosts: string[] }                    // 允许访问的域名白名单
  | { type: 'fs'; paths: string[]; mode: 'r' | 'w' | 'rw' } // 文件系统路径 + 读写模式
  | { type: 'env'; keys: string[] }                         // 可读环境变量
  | { type: 'spawn'; commands: string[] }                   // 允许执行的子进程命令
  | { type: 'ui'; inject: ('menu' | 'page' | 'widget')[] }  // UI 注入范围
  | { type: 'api'; endpoints: string[] };                   // 可调用的宿主 API 端点
```

| 类型 | 示例 | 用途 |
|---|---|---|
| `network` | `{ hosts: ['api.github.com'] }` | fetch 域名白名单 |
| `fs` | `{ paths: ['/downloads'], mode: 'rw' }` | 文件路径白名单 + 读写模式 |
| `env` | `{ keys: ['API_KEY'] }` | 环境变量白名单 |
| `spawn` | `{ commands: ['ytdlp'] }` | 子进程命令白名单 |
| `ui` | `{ inject: ['menu', 'page'] }` | 菜单/页面/Widget 注入范围 |
| `api` | `{ endpoints: ['/api/downloads'] }` | 宿主 API 端点白名单 |

### 3.1 manifest 声明

```json
{
  "permissions": [
    { "type": "network", "hosts": ["api.github.com"] },
    { "type": "fs", "paths": ["${DOWNLOAD_DIR}"], "mode": "rw" },
    { "type": "spawn", "commands": ["ytdlp", "ffmpeg"] }
  ]
}
```

manifest 在安装时全量声明权限，用户在市场 UI 看到该清单并显式批准。

## 4. 运行时强制

### 4.1 设计：作用域化 API 注入

宿主按 `manifest.permissions` 构建受限能力集，经沙箱注入 Worker（`02-sandbox.md` §4.5 的序列化约束同样适用于此）：

```typescript
const scopedFetch = makeScopedFetch(manifest.permissions);   // 非白名单域名 → 403
const scopedFs = makeScopedFs(manifest.permissions);         // 非白名单路径 → EACCES
const scopedRequire = makeScopedRequire(manifest.permissions);
const scopedSpawn = makeScopedSpawn(manifest.permissions);   // 非白名单命令 → EPERM
```

### 4.2 MVP 落地状态（如实说明）

v3.1.0 MVP 中，**已落地的强制点是 UI 注册门控**：`PluginHost` 在 `registerMenu` 调用处检查 `ui.inject.menu`，无权限则拒绝登记并告警（不抛错、不中断插件）：

```typescript
registerMenu: (m) => {
  if (this.hasUiPermission(manifest, 'menu')) {
    this.menus.push(m);
  } else {
    console.warn(`[PluginHost] ${id} denied menu registration (no ui.inject.menu permission)`);
  }
}
```

`scopedFetch / scopedFs / scopedRequire / scopedSpawn` 的 Worker 侧注入属设计定稿、**未纳入 MVP**，随真实下载协议适配器（v3.2.0+）落地。MVP 的唯一插件 hello-world 仅声明 `ui.inject.menu`，不触及网络/文件/子进程面。

### 4.3 判定助手（纯函数）

`packages/plugin-sdk` 导出以下助手，宿主在各强制点调用（全部为无副作用纯函数，SDK 包零运行时依赖的保证见 `01-architecture.md` §5）：

| 助手 | 语义 |
|---|---|
| `hasNetworkPermission(perms, host)` | 域名在白名单（支持 `'*'` 通配） |
| `hasFsPermission(perms, path, mode)` | 路径前缀匹配 + 读写模式兼容（`rw` 兼容 `r`/`w` 请求） |
| `hasUiPermission(perms, scope)` | `menu` / `page` / `widget` 范围判定 |
| `hasSpawnPermission(perms, command)` | 命令精确匹配（无 shell 展开） |
| `isPermissionGranted(granted, requested)` | 全等判定某条权限是否已授予 |

## 5. 用户授权流程

```text
[用户在市场点击「安装」]
        │
        ▼
[宿主解析插件 manifest.json]
        │
        ▼
[UI 展示权限清单（人类可读描述）]
        │
   ┌────┴────┐
   ▼         ▼
[批准]     [拒绝]
   │         │
   ▼         ▼
写入        删除已下载包
plugins/    不写 installed.json
installed.json  插件永远不会被加载
   │
   ▼
[下次宿主启动时 PluginHost 加载]
```

批准写入的 `plugins/installed.json` 条目（本迭代新增；完整 schema 见 `04-lifecycle.md` §7）：

```json
{
  "hello-world": {
    "version": "1.0.0",
    "path": "hello-world/",
    "enabled": true,
    "approvedAt": "2026-08-26T00:00:00.000Z",
    "state": "installed",
    "lastError": null
  }
}
```

`approvedAt` 记录授权时间点，是审计依据：manifest 权限与授权记录一一对应。

## 6. 安全考量

- **权限只增不减的语义**：声明更多权限不会缩小隔离面；审核视角下，权限清单越长应越谨慎。
- **通配符不绕过审计**：`hosts: ['*']` 放行所有域名，但仍经过 scoped fetch 调用点，日志/审计钩子保留。
- **只读是默认语义**：`fs.mode: 'r'` 下任何写操作被拒绝；插件想写必须显式声明 `'w'` 或 `'rw'`。
- **spawn 精确匹配**：只允许白名单中的确切命令名，不经 shell 解释，杜绝 `ytdlp; rm -rf /` 类拼接。
- **失败不泄密**：权限拒绝返回通用错误码（403/EACCES/EPERM），不回显白名单内容，避免插件探测宿主配置。
- **与 GM 后台的关系**：S3 的 GM 后台（`/api/gm/*`，见 `apps/api/src/routes/gm.routes.ts`）复用同一套「声明 + 判定」思想，但 GM 权限是宿主内部角色模型，与插件权限互不授予。

## 7. 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| 运行时动态申请（类浏览器扩展） | 推迟到 v3.2.0+：需要授权 UI、授权状态持久化、已授权项撤销机制；MVP 用「安装时全量声明」换取实现与审计的简单性。 |
| capability 对象注入（不传全局，只传能力句柄） | 采纳为设计方向（scoped API 即能力句柄）；MVP 因仅菜单门控落地，完整注入随协议适配器迭代。 |
| 权限用位掩码/枚举而非结构化对象 | 否决：六类权限参数形状差异大（hosts/paths/keys/commands…），结构化 union 类型配合 zod 校验更清晰。 |
| 路径用 glob 匹配 | 否决：MVP 用前缀匹配（`path.startsWith(allowed)`），语义可预测；glob 的 `..`/符号链接逃逸风险另需规范化配套，列入开放问题。 |

## 8. 开放问题

1. **`env` 与 `api` 类型暂无判定助手**：SDK MVP 只导出 4 个专项助手 + `isPermissionGranted`；env/api 的强制点与助手随对应能力落地补齐。
2. **路径规范化**：`fs` 前缀匹配对 `..`、符号链接、Windows 盘符大小写不免疫，需要在强制点前做 `path.resolve` 规范化与真实路径比对。
3. **权限变更的升级路径**：插件升级版本时 manifest 权限增加，是否需要用户重新授权（倾向：需要，按差异项重新展示）。
4. **`${DOWNLOAD_DIR}` 等占位符**：manifest 中环境占位的展开时机与白名单校验的先后顺序待定义。
