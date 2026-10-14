# Download Manager

一个现代化的下载管理系统，支持文件下载、上传、分享、统计分析等功能。

## ✨ 功能特性

### 核心功能
- 📥 **下载管理** - 支持批量下载、断点续传、优先级管理
- 🌐 **分布式架构** - 基于 Master-Worker 模型，支持横向扩展下载节点，具备故障自动恢复与重调度能力
- 💻 **多端覆盖** - 提供 Electron 桌面壳、移动端 PWA 及 Web 访问
- 🔌 **插件系统** - 支持 ZIP 插件安装、自动化生命周期钩子及分布式后处理
- 🤖 **AI 驱动** - 内置智能分类插件，自动识别资源类型、建议标签及优先级
- 📤 **上传管理** - 支持拖拽上传、批量上传、进度可视化
- 📁 **文件管理** - 文件重命名、删除、移动、创建文件夹
- 🔗 **分享管理** - 生成分享链接、密码保护、过期时间设置
- ⏰ **调度管理** - 定时下载、循环任务、执行日志

### 数据统计
- 📊 **统计仪表板** - 下载/上传趋势图表
- 📁 **文件类型分布** - 按类型统计文件数量和大小
- 🕐 **最近活动** - 查看最近的下载/上传记录

### 性能优化
- 🚀 **虚拟滚动** - 支持 10000+ 条数据流畅渲染
- 📦 **代码分割** - React.lazy + Suspense 按需加载
- ⚡ **首屏优化** - 骨架屏、DNS预解析、资源预加载

### 用户体验
- 🌓 **深色模式** - 支持亮色/深色/跟随系统
- ⌨️ **键盘快捷键** - 快速操作支持
- 📱 **响应式设计** - 适配各种屏幕尺寸

## 🛠️ 技术栈

这是一个 **pnpm workspaces monorepo**（要求 pnpm >= 10.34.6，见 `packageManager` 字段）。

### 前端（apps/web）
- React 19 + TypeScript
- Vite 8 + Tailwind CSS 4
- shadcn/ui 组件库
- Zustand 状态管理
- Vitest 测试框架
- **PWA** (Vite PWA Plugin)

### 桌面端（apps/desktop）
- Electron 32
- TypeScript + Vite
- 原生 IPC 桥接 (Preload)

### 后端（apps/api - Master）
- Node.js + Express + TypeScript
- MySQL 数据库 + Prisma ORM
- Redis 消息队列 (ioredis)
- Zod 入参校验 + JWT 认证
- 插件系统宿主 (SandboxRunner)

### 下载节点（apps/worker - Worker）
- 轻量级 Node.js 运行时
- **@dm/engine** 高性能下载引擎
- FFmpeg 视频预处理
- Redis 心跳与任务监听

### 共享包（packages）
- **@dm/shared**: 跨端复用的 Zod schema、枚举、Redis 频道定义
- **@dm/plugin-sdk**: 插件开发标准化接口
- **@dm/engine**: 事件驱动的 HTTP/BT 下载核心逻辑

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 10.34.6
- MySQL 8.0（可用 `pnpm db:up` 通过 Docker 启动）

### 安装依赖

```bash
pnpm install
```

### 启动数据库与初始化

```bash
pnpm db:up          # 启动 MySQL（docker compose）
pnpm db:migrate     # 执行 Prisma 迁移
pnpm db:seed        # 写入种子数据（可选）
```

### 运行开发服务器

```bash
pnpm dev:api        # 启动 Master (API) → http://localhost:5001
pnpm dev:web        # 启动 Web 前端     → http://localhost:3000
pnpm dev:worker     # 启动 Worker 节点  (支持启动多个)
pnpm dev:shell      # 启动 Electron 桌面外壳
```

📖 API 文档（Swagger UI）：http://localhost:5001/docs （由 `pnpm --filter api gen:openapi` 生成的 `apps/api/openapi.json` 驱动）

### 构建生产版本

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

> 集成测试依赖数据库：`pnpm db:up` 未启动时，涉及数据库的套件会自动跳过（不会让测试崩溃）；纯单元测试照常执行。依赖扫描请用 `pnpm audit --registry=https://registry.npmjs.org`（npmmirror 镜像不支持 audit 端点，会漏报）。

### 代码检查

```bash
pnpm lint
```

## 🏗️ 项目结构

```
download-manager/
├── apps/
│   ├── api/                  # Master 节点：调度、API、插件宿主
│   ├── worker/               # Worker 节点：物理下载、本地后处理
│   ├── web/                  # Web/PWA 前端
│   ├── desktop/              # Electron 桌面客户端
│   └── gm-admin/             # 资源治理/监控后台
├── packages/
│   ├── engine/               # 下载引擎核心 (HTTP/BT)
│   ├── shared/               # 跨端共享通讯协议
│   └── plugin-sdk/           # 插件开发 SDK
├── docker-compose.yml        # 基础服务 (MySQL, Redis)
└── SPEC.md                   # 详细功能规范
```

## 📖 使用说明

### 下载文件
1. 点击「新建下载」按钮
2. 输入下载链接
3. 可选：设置优先级和文件名
4. 点击「开始下载」

### 上传文件
1. 拖拽文件到上传区域，或点击选择文件
2. 文件会自动开始上传
3. 可查看上传进度和状态

### 分享文件
1. 在文件列表中选择文件
2. 点击「分享」按钮
3. 设置密码保护和过期时间（可选）
4. 复制分享链接

### 调度任务
1. 点击「新建计划」按钮
2. 设置执行类型（一次性/每日/每周/每月）
3. 设置执行时间
4. 查看执行日志

## 🔒 安全特性

- JWT 令牌认证
- API 访问频率限制
- SQL 注入防护
- XSS 攻击防护
- 文件类型白名单验证

## 📊 性能指标

- 首屏加载时间：< 2秒
- 列表渲染：支持 10000+ 条数据
- 代码分割：首屏 JS Bundle < 1MB

## 📝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 📄 许可证

MIT License