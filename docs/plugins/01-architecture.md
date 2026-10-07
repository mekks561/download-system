# RFC-01：插件系统总体架构

- **状态**：Accepted（设计决策已随 v3.1.0 设计文档批准，实现与本文档同迭代推进）
- **版本**：v3.1.0（S4 插件系统 RFC + MVP）
- **日期**：2026-08-26
- **上游依据**：`docs/superpowers/specs/2026-08-26-v3.1.0-design.md` §6（插件系统 RFC + MVP）；实现计划 `docs/superpowers/plans/2026-08-26-v3.1.0-s4-plugin.md`
- **系列文档**：01 架构（本篇）→ 02 沙箱 → 03 权限 → 04 生命周期 → 05 市场 API

> **引用约定**：本文引用的仓库路径中，标注「（本迭代新增）」者随 S4 实现任务（plan Task 9-12）落地，撰写时可能尚不存在；未标注者均为仓库中已存在的文件。目录树/架构图中的 `packages/plugin-sdk/`、`apps/api/src/plugins/`、`plugins/`（含 `installed.json`）整体同属本迭代新增。

## 1. 背景

Download Manager v3.0.0 完成了 pnpm monorepo 化（`apps/api` + `apps/web` + `apps/gm-admin` + `packages/shared`），但系统能力是封闭的：新增下载协议、下载完成后的自定义动作、界面扩展都只能通过修改主仓库代码实现。v3.1.0 引入插件系统，目标是让第三方扩展可以在**不修改宿主代码**的前提下接入三类能力，同时不破坏 v3.0.0 的 API 契约（信封 `{ success, data | error, timestamp }`，见 `packages/shared/src/schemas/api.ts`）。

## 2. 目标 / 非目标

### 2.1 目标（v3.1.0）

- 定义三类插件接口（下载协议适配器 / 脚本插件 / UI 插件）与统一的插件清单（manifest）格式。
- 发布插件作者面向的 SDK 包 `packages/plugin-sdk`（本迭代新增）：纯类型 + 纯函数权限助手，可独立 `npm publish`。
- 宿主侧落地 `PluginHost`（生命周期管理）与 `SandboxRunner`（worker_threads 沙箱），位于 `apps/api/src/plugins/`（本迭代新增）。
- 交付可运行的 MVP 参考插件 `plugins/hello-world`（本迭代新增）：注册一个菜单项 + 监听下载完成事件。
- 提供插件市场 API 骨架（静态注册表，详见 `05-marketplace.md`）。

### 2.2 非目标（推至 v3.2.0+）

- 插件市场前端页面（v3.1.0 仅 API 骨架与静态注册表）。
- 远程注册表下载、签名验证、插件评分、依赖解析。
- 除 hello-world 外的任何真实下载协议适配器（magnet/FTP/ytdlp 等）。
- Electron 桌面宿主集成：设计文档将 `apps/desktop` 列为规划中的部署形态，但当前仓库尚未包含该应用；v3.1.0 的插件宿主就是 `apps/api` 的 Node.js 进程。

## 3. 技术栈基线（与仓库现实对齐）

| 维度 | 现状 | 依据 |
|---|---|---|
| 模块系统 | 全仓库 ESM（各包 `"type": "module"`） | `package.json`、`apps/api/package.json` |
| 运行时 | Node.js >= 20 | 根 `package.json` `engines` |
| 包管理 | pnpm 10.34.6 workspaces | 根 `package.json`、`pnpm-workspace.yaml` |
| 语言 | TypeScript 6（`^6.0.3`） | `packages/shared/package.json` |
| 后端 | Express 4 + Prisma 6 + zod 4，端口 **5001** | `apps/api/package.json`、`apps/api/src/server.ts` |
| 前端 | React 19 + Vite 8，dev 端口 **3000** | `apps/web/package.json`、`apps/web/vite.config.ts` |
| GM 后台 | React 19，dev 端口 **3100** | `apps/gm-admin/vite.config.ts` |
| 数据库 | MySQL 8.0（Prisma ORM） | `README.md`、`docker-compose.yml` |

## 4. 三类插件

单一接口无法覆盖全部场景：UI 渲染需要 DOM（只能在主界面进程），下载协议是重 CPU/IO 工作（应隔离到 Worker）。因此按运行位置与职责拆成三类，`manifest.type` 判别：

### 4.1 下载协议适配器（`type: 'download-adapter'`）

实现 `DownloadAdapter` 接口，为宿主新增一种下载协议（magnet、FTP、ytdlp 等）。运行在 worker_threads 沙箱中，每个下载任务是由适配器管理的长生命周期对象。

```typescript
// packages/plugin-sdk/src/types.ts（本迭代新增）
export interface DownloadAdapter {
  canHandle(url: URL): boolean;
  createTask(url: URL, opts: DownloadOpts): Promise<DownloadTask>;
  onProgress(taskId: string, cb: (p: Progress) => void): Unsubscribe;
  pause(taskId: string): Promise<void>;
  resume(taskId: string): Promise<void>;
  cancel(taskId: string): Promise<void>;
}
```

### 4.2 脚本插件（`type: 'script'`）

监听宿主生命周期事件（`onDownloadStart` / `onDownloadComplete` / `onDownloadError` / `onFileSaved` / `onSchedule`）的无状态钩子，由宿主在事件广播时调用。运行在 worker_threads 沙箱中。

### 4.3 UI 插件（`type: 'ui'`）

通过 `PluginContext` 提供的命令式注册器（`ctx.registerMenu / registerPage / registerWidget`）向主界面注入菜单、页面或 Widget。UI 贡献的渲染发生在主界面 React 进程（受 CSP 约束）；插件自身的 `activate` 逻辑仍在 Worker 中执行，注册器调用经消息桥接转发给宿主。v3.1.0 的 hello-world 即为此类。

## 5. 包边界

```
download-manager/
├── packages/
│   ├── shared/                 # 已有：Zod schema、错误码、API 信封
│   └── plugin-sdk/             # 本迭代新增：@dm/plugin-sdk
│       └── src/
│           ├── types.ts        # PluginManifest / 三类插件接口 / PluginContext / PluginLifecycle
│           ├── permissions.ts  # 6 类权限类型 + 权限判定纯函数
│           └── index.ts        # 公共导出（SDK_VERSION = '3.1.0'）
├── apps/api/src/
│   └── plugins/                # 本迭代新增：宿主侧运行时
│       ├── PluginHost.ts       # 生命周期：loadAll / broadcast / uninstall / shutdown
│       └── SandboxRunner.ts    # worker_threads 封装
├── plugins/                    # 本迭代新增：示例插件与安装登记
│   ├── hello-world/            # MVP 参考插件（manifest.json + index.js）
│   └── installed.json          # 已安装插件登记表
└── docs/plugins/               # 本系列 RFC
```

**SDK 边界原则**：`@dm/plugin-sdk` 只导出类型与纯函数（如权限判定），**不依赖 Express / Prisma / React** 等宿主依赖。由此获得：

- 插件作者只需把 SDK 作为 devDependency 安装即可获得的类型检查，无需拖入宿主依赖树；
- SDK 可独立 `npm publish`，版本演进与宿主解耦；
- 宿主与 SDK 之间不可能产生循环依赖（依赖方向单向：宿主 → SDK ← 插件）。

## 6. 宿主架构

```text
┌────────────────────────────────────────────────────────────┐
│ Node.js 宿主进程                                            │
│                                                            │
│  apps/api（Express，:5001）                                 │
│   ├─ routes：/api/auth /api/downloads ... /api/gm（已有）   │
│   ├─ routes：/api/plugins/*（本迭代新增，见 05-marketplace）│
│   └─ plugins/（本迭代新增）                                 │
│       ├─ PluginHost                                        │
│       │   ├─ 读取 plugins/installed.json                   │
│       │   ├─ 为每个启用插件 fork 一个 SandboxRunner         │
│       │   ├─ 按 manifest.permissions 门控注册器调用         │
│       │   └─ 向各 Worker 广播生命周期事件                   │
│       └─ SandboxRunner ── worker_threads.Worker            │
│                            └─ 插件入口 index.js             │
│                                                            │
│  apps/web（React 19，dev :3000）                            │
│   └─ 渲染插件注册的菜单/页面/Widget（UI 贡献）              │
│                                                            │
│  MySQL 8.0（Prisma）                                       │
└────────────────────────────────────────────────────────────┘
```

要点：

- 插件代码**不**运行在 Express 请求处理线程上；所有插件逻辑都在独立 Worker 线程，通过 `postMessage` 与宿主通信（协议见 `02-sandbox.md`）。
- UI 插件的 React 组件在主界面进程渲染，但注册动作由宿主按权限门控后生效（见 `03-permissions.md`）。
- 插件系统为可选模块：无 `plugins/installed.json` 或全部 `enabled: false` 时，宿主行为与 v3.0.0 完全一致。

## 7. 安全考量

- **Worker 不是安全边界**：worker_threads 提供的是隔离（独立 V8 上下文与事件循环），不是对抗恶意代码的沙箱。真正的防线是权限模型（`03-permissions.md`）+ 安装时的用户显式授权 + 未来的签名验证。
- **最小权限**：manifest 必须声明全部所需权限；宿主只注入白名单内的能力，未声明即拒绝（MVP 已在菜单注册点落地此门控）。
- **不扩大攻击面**：插件市场 API 全部挂在 `requireAuth` 之后（复用 `apps/api/src/middleware/auth.ts` 的 JWT 认证）；插件不能直接注册新的 Express 路由。
- **SDK 零运行时依赖**：插件作者的类型包不含可执行宿主代码，降低供应链注入面。

## 8. 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| 单一插件接口 | 否决。UI 需要 DOM、下载协议需要 Worker 隔离，单一接口必然在其中一端妥协；拆三类后每类语义清晰。 |
| SDK 内建于 apps/api | 否决。插件作者将被迫安装整个宿主依赖树，且无法独立发布；独立 `packages/plugin-sdk` 是 monorepo 下成本最低的做法。 |
| 插件直接跑在 Express 进程内 | 否决。任一插件死循环/崩溃将拖垮 API；Worker 隔离后崩溃面收敛到单个插件（见 `04-lifecycle.md` 错误恢复）。 |
| 使用 npm 包名作为插件 id | 否决。manifest.id 与 npm 包名解耦，允许私有分发与本地安装（v3.1.0 的 install 即走本地文件系统）。 |

## 9. 开放问题

1. **Electron 桌面宿主**：设计文档规划的 `apps/desktop` 尚未落地；落地后 PluginHost 的驻留进程（主进程 vs API 子进程）需要重新评估，原则上不改动本架构的模块边界。
2. **UI 插件的组件分发**：`registerPage/registerWidget` 需要把 React 组件从插件包送进主界面进程，组件代码的打包格式（ESM bundle？）与 CSP 策略待定，v3.2.0 随市场前端一并设计。
3. **插件间通信**：当前禁止 Worker 直连，必须经 `ctx.host.emit` 由宿主中转；是否需要正式的插件间依赖声明（plugin A requires plugin B）留待市场迭代。
4. **SDK 版本兼容策略**：`SDK_VERSION` 与宿主版本的兼容矩阵（semver 范围还是精确匹配）尚未定义。

## 10. MVP 范围 vs 未来迭代

**v3.1.0 MVP 范围**（随本迭代实现任务落地）：

- `packages/plugin-sdk`：三类接口 + 6 类权限类型 + 权限判定纯函数，可独立 build/test。
- `apps/api/src/plugins/`：PluginHost + SandboxRunner，可加载 hello-world。
- `plugins/hello-world`：`type: 'ui'`，注册「Say Hello」菜单项，监听 `download:complete`。
- 市场 API 骨架：静态注册表 + 本地 install（见 `05-marketplace.md`）。

**未来迭代（v3.2.0+）**：市场前端、远程注册表与签名验证、真实下载协议适配器、运行时权限动态申请、Electron 宿主集成。
