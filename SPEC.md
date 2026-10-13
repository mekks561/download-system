# 下载管理系统 - 功能规范

## 项目概述

**项目名称**: Download Manager
**当前版本**: 3.1.0
**技术栈**: pnpm workspaces monorepo（apps/api + apps/web + apps/gm-admin + packages/shared + packages/plugin-sdk）

### 技术栈
- **项目结构**：pnpm workspaces monorepo（apps/api + apps/web + apps/gm-admin + packages/shared + packages/plugin-sdk）
- **后端**：TypeScript + Express 4 + Prisma 6 + MySQL 8 + Zod 4（端口 5001）
- **前端**：React 19 + Vite 8 + TypeScript 6 + Zod 4（从 @dm/shared 导入；主站端口 3000，GM 后台端口 3100）
- **GM 管理后台**：apps/gm-admin 独立 workspace app（React 19 + Vite + Tailwind v4，独立 gm_users 账号与 GM JWT）
- **共享**：@dm/shared Zod schema 契约层（单一真相源）
- **插件**：@dm/plugin-sdk + worker_threads 沙箱运行时（PluginHost / SandboxRunner，v3.1.0）
- **测试**：Vitest 4（前后端统一；全仓基线 532 测试）
- **API 文档**：OpenAPI 自动生成（zod-to-openapi，61 operations，`/docs` Swagger UI）
- **实时推送**：基于 Socket.IO 的全链路通知（下载进度/完成/失败、上传进度、系统通知）
- **调度执行**：基于 node-cron 的后端定时任务运行时，支持任务触发、日志记录与自动下载

## 核心功能

### 1. 用户系统
- 登录/登出、会话管理
- JWT 认证

### 2. 下载管理
- 批量下载、断点续传、优先级管理
- 下载队列、重试机制

### 3. 上传管理
- 拖拽上传、批量上传、进度可视化

### 4. 文件管理
- 文件重命名、删除、移动、创建文件夹

### 5. 分享管理
- 生成分享链接、密码保护、过期时间设置
- 分享链接启用/禁用、下载次数限制

### 6. 调度管理
- 定时下载、循环任务（每日/每周/每月）
- 执行日志查看

### 7. 数据统计
- 下载/上传趋势图表
- 文件类型分布统计
- 最近活动列表

### 8. 设置中心
- 主题切换（浅色/深色/自动）
- 语言选择（国际化）
- 下载/上传配置

## 技术架构

### 前端
```
src/
├── components/    # React 组件
├── hooks/         # 自定义 Hooks
├── pages/         # 页面组件
├── services/      # API 服务
├── store/         # Zustand 状态管理
├── types/         # TypeScript 类型定义
└── i18n/          # 国际化配置
```

### 后端
```
apps/api/
├── src/
│   ├── routes/       # 路由
│   ├── services/     # 业务服务（含下载引擎与调度执行器）
│   ├── middleware/   # 中间件
│   ├── config/       # 配置（Prisma、Socket.IO、插件宿主）
│   └── plugins/      # 插件沙箱运行时
├── prisma/           # 数据库 schema 与迁移脚本
└── scripts/          # 运维脚本（OpenAPI 生成、DB 导入导出）
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