# 下载管理系统 - 功能规范

## 项目概述

**项目名称**: Download Manager
**当前版本**: 3.5.0 (Industrialization 2.0)
**技术栈**: pnpm workspaces monorepo (Master-Worker Distributed Architecture)

### 技术栈
- **架构模式**：Master-Worker 分布式架构。Master 负责调度、AI 决策与插件同步；Worker 负责物理下载、资源处理与沙箱执行。
- **项目结构**：pnpm workspaces monorepo（apps/api + apps/worker + apps/web + apps/gm-admin + apps/desktop + packages/shared + packages/plugin-sdk）
- **后端 (Master)**：TypeScript + Express 4 + Prisma 6 + MySQL 8 + Redis 7 + Zod 4
- **下载节点 (Worker)**：轻量级 Node.js 运行时 + @dm/engine + FFmpeg
- **前端**：React 19 + Vite 8 + TypeScript 6 + Zod 4（主站端口 3000，GM 后台端口 3100）
- **桌面端**：Electron 32 + 原生 IPC 桥接 + 全局快捷键响应
- **AI 引擎**：OpenAI (GPT-4o-mini / text-embedding-3-small)
- **向量检索**：基于 Embedding 的向量语义搜索
- **实时推送**：基于 Socket.IO + Redis Pub/Sub 的全链路通知
- **测试**：Vitest 4 (全仓基线测试)

## 核心功能 (Industrialization 2.0)

### 1. 分布式高可用集群 (Cluster HA)
- **多节点管理**：Worker 节点自动发现、心跳监控与健康检查。
- **地域感知调度 (Geo-aware)**：AI 自动识别 URL 地域，就近调度至最佳 Worker。
- **故障自愈 (Failover)**：Worker 离线时任务自动重调度至健康节点。
- **存储均衡 (Balancing)**：跨节点大文件物理迁移，确保存储水位均衡。
- **自动伸缩 (Auto-scaling)**：基于 AI 流量预测的无人值守扩缩容。

### 2. AI 驱动的资源治理 (AI Governance)
- **智能归档 (Archiving)**：冷热数据识别，低频大文件自动压缩归档与按需还原。
- **语义搜索 (Semantic Search)**：Spotlight 风格的全局语义搜索，支持跨任务、跨归档文件的自然语言检索。
- **错误自愈 (Auto-healing)**：AI 诊断下载失败原因并执行自动修复（重试/镜像切换）。
- **语义去重**：基于向量相似度的重复资源识别。

### 3. 工业化插件系统 (Plugin 2.0)
- **分布式同步**：插件全自动从 Master 热推送到所有 Worker 节点。
- **安全审计门禁**：AI 代码审计插件风险，拦截高风险恶意插件。
- **深度沙箱隔离**：Worker 侧独立的线程级沙箱，严格限制内存与资源配额。

### 4. 桌面端原生集成 (Native Bridge)
- **系统托盘**：动态进度显示与任务数监控。
- **原生通知**：下载完成、系统告警的原生推送。
- **全局快捷键**：`Alt+Shift+S` 全局呼起 AI 搜索中心。
- **文件穿梭**：支持原生文件管理器定位及目录直接选择。

## 技术架构

### 架构图 (Logic)
```
[Desktop/Web] <--> [Master (API)] <--> [Redis/MySQL]
                        |
            [AI Engine (OpenAI)]
                        |
            [Worker A] [Worker B] [Worker C]
```

### 核心目录
```
download-manager/
├── apps/
│   ├── api/                  # Master: 调度、AI 决策、插件同步
│   ├── worker/               # Worker: 物理下载、资源处理、沙箱
│   ├── web/                  # Web/PWA 前端
│   ├── desktop/              # Electron 桌面客户端
│   └── gm-admin/             # 资源治理中心/集群监控后台
├── packages/
│   ├── engine/               # 事件驱动下载引擎
│   ├── shared/               # 跨端契约定义 (Zod/Enums)
│   └── plugin-sdk/           # 插件开发 SDK
└── SPEC.md                   # 本文档
```

## API 端点

### 用户认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册

### 下载管理
- `GET /api/downloads` - 获取下载列表
- `POST /api/downloads` - 创建下载
- `POST /api/downloads/:id/start` - 开始下载
- `POST /api/downloads/:id/pause` - 暂停下载
- `POST /api/downloads/:id/resume` - 继续下载
- `POST /api/downloads/:id/cancel` - 取消下载
- `DELETE /api/downloads/:id` - 删除下载

### 上传管理
- `POST /api/uploads` - 上传文件
- `GET /api/uploads` - 获取上传列表
- `DELETE /api/uploads/:id` - 删除上传

### 文件管理
- `PUT /api/files/:id/rename` - 重命名文件
- `DELETE /api/files/:id` - 删除文件
- `PUT /api/files/:id/move` - 移动文件
- `POST /api/files/folder` - 创建文件夹

### 分享管理
- `POST /api/shares` - 创建分享
- `GET /api/shares` - 获取分享列表
- `PUT /api/shares/:id` - 更新分享
- `DELETE /api/shares/:id` - 删除分享
- `POST /api/shares/:id/toggle` - 启用/禁用分享

### 调度管理
- `GET /api/schedules` - 获取调度列表
- `POST /api/schedules` - 创建调度
- `PUT /api/schedules/:id` - 更新调度
- `DELETE /api/schedules/:id` - 删除调度
- `GET /api/schedules/:id/logs` - 获取执行日志

### 统计数据
- `GET /api/stats` - 统计概览
- `GET /api/stats/trend` - 趋势数据
- `GET /api/stats/file-types` - 文件类型分布
- `GET /api/stats/activities` - 最近活动

### GM 管理后台 (B-lite)
- `POST /api/gm/auth/login` - GM 登录
- `GET /api/gm/dashboard` - 全局数据概览
- `GET /api/gm/users` - 用户管理列表（分页）
- `PATCH /api/gm/users/:id` - 更新用户（角色/禁用）
- `POST /api/gm/users/:id/reset-password` - 重置用户密码
- `GET /api/gm/downloads` - 下载审计列表（分页）
- `POST /api/gm/downloads/:id/cancel` - 强制中断下载（联动引擎）
- `GET /api/gm/uploads` - 上传审计列表（分页）
- `GET /api/gm/plugins` - 插件列表
- `POST /api/gm/plugins/:id/toggle` - 启用/禁用插件
- `DELETE /api/gm/plugins/:id` - 物理卸载插件

## 性能优化与最佳实践

### 前端优化
- **虚拟滚动 (Virtual Scrolling)**: 大数据量列表（如 10000+ 条记录）使用 `react-window` 渲染可见区域，DOM 节点减少 90% 以上。
- **代码分割 (Code Splitting)**: 使用 `React.lazy` + `Suspense` 按需加载组件，首屏 Bundle 减少约 50%。
- **记忆化缓存**: 列表项使用 `React.memo` 防止无效重绘，复杂计算与回调函数分别使用 `useMemo` 和 `useCallback` 缓存。
- **加载体验**: 实现骨架屏（Skeleton Screen）和性能监控组件（Core Web Vitals），提升用户感知加载速度。

### 后端优化
- **流式传输**: 下载与上传任务采用 Node.js Stream 管道处理，避免大文件占用内存。
- **Prisma 索引**: 在 `userId`、`status`、`createdAt` 等高频查询字段建立数据库索引。
- **异步解耦**: 下载任务由独立的 `DownloadEngine` 异步处理，并通过 Socket.IO 实时同步状态，避免阻塞 API 响应。

## 🗄 数据库系统 (Prisma / MySQL)

### 核心数据模型
- **User**: 用户账户与角色控制。
- **Download**: 下载任务全状态追踪（URL、进度、速度、本地路径）。
- **Upload**: 上传记录与 UUID 文件名映射。
- **File**: 系统内部文件元数据管理。
- **Share**: 分享链接元数据（提取码、有效期、下载计数）。
- **Schedule / ScheduleLog**: 定时任务定义及其执行审计日志。
- **Activity**: 系统级操作审计流水。
- **AppSettings**: 应用级设置持久化（权威源同步）。

## 🛠 技术债 (Technical Debt)

### 1. 🟡 桌面端缺失 (apps/desktop)
- **现状**: 目录结构中预留但实际代码未落地。
- **影响**: Web 端无法实现“原生目录选择器”和本地磁盘直接探测。

### 2. 🟡 GM 管理后台上传功能
- **现状**: 后端 Controller 已有雏形但前端界面未实现。
- **优先级**: P3（功能补全）。

### 3. 🟡 插件上传与校验
- **现状**: 目前仅支持物理删除和状态切换，缺少 Web 端插件上传及包合法性校验。

---

**最后更新**: 2026-10-13