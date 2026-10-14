# Download Manager (Industrialization 2.0)

一个现代化的、工业级分布式下载管理系统，具备 AI 驱动的治理能力与高可用集群架构。

## ✨ 核心特性 (Industrialization 2.0)

### 🤖 AI 智能驱动
- **语义搜索 (Spotlight)** - 按下 `Alt+Shift+S` 呼起全局 AI 搜索中心，支持跨节点、跨归档文件的模糊语义检索。
- **智能资源治理** - 自动识别冷热数据，提供一键归档压缩与按需还原建议。
- **下载自愈 (Auto-healing)** - AI 诊断 403/404 等下载错误并自动执行重试或镜像修复。
- **流量预测** - AI 预测未来 24 小时流量高峰，配合无人值守模式实现 Worker 自动伸缩。

### 🌐 分布式高可用
- **Master-Worker 架构** - 节点自动发现、负载均衡调度及地域感知 (Geo-aware) 重调度。
- **故障转移 (Failover)** - 节点离线时任务秒级重调度，确保存量下载不中断。
- **存储平衡** - 跨节点大文件物理迁移，确保存储空间水位均衡。

### 🔌 工业化插件系统
- **分布式热同步** - 插件自动从 Master 推送至所有 Worker 节点，无需手动配置。
- **AI 安全审计** - 插件上传即进行代码扫描，拦截高风险恶意脚本。
- **沙箱隔离执行** - 基于线程级沙箱，严格限制插件的内存与 CPU 配额。

### 💻 深度原生集成
- **桌面端增强** - 系统托盘动态进度、原生系统通知、全局快捷键支持。
- **文件穿梭** - 原生目录选择器支持，支持在资源管理器中直接定位已完成文件。

## 🛠️ 技术栈

这是一个基于 **pnpm workspaces monorepo** 的全栈项目。

- **Master (API)**: Node.js, Express, Prisma, MySQL, Redis, Socket.IO, OpenAI API
- **Worker**: Node.js, FFmpeg, @dm/engine (HTTP/BT/Magnet)
- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui, Zustand
- **Desktop**: Electron 32, IPC Bridge, Global Shortcuts
- **Shared**: Zod-based contract, shared schemas

## 🚀 快速开始

### 环境配置

1. **配置环境变量** (`apps/api/.env`):
   ```env
   OPENAI_API_KEY=your_key
   OPENAI_BASE_URL=https://api.openai.com/v1
   INTERNAL_SECRET=your_secret_for_worker_communication
   ```

2. **安装并启动**:
   ```bash
   pnpm install
   pnpm db:up          # 启动数据库 (Docker)
   pnpm db:migrate     # 数据库迁移
   ```

3. **启动开发环境**:
   ```bash
   pnpm dev:api        # 启动 Master
   pnpm dev:worker     # 启动 Worker
   pnpm dev:web        # 启动 Web 前端
   pnpm dev:shell      # 启动桌面外壳
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