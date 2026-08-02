# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-08-01

### 破坏性变更
- 删除 LowDB/SQLite 支持，仅支持 MySQL 8.0+
- 后端从 JavaScript 重写为 TypeScript
- 引入 Prisma ORM 替代 mysql2
- 项目结构改为 pnpm workspaces monorepo（apps/web + apps/api + packages/shared）
- 前后端共享 @dm/shared Zod schema 契约层（单一真相源）
- API 响应统一为 { success, data/error, timestamp } 信封格式

### 新增
- 数据契约层（@dm/shared）：8 实体 Zod schema + 枚举 + API 信封 + 错误码
- Prisma ORM + MySQL 8：8 张表（users/downloads/uploads/files/shares/schedules/schedule_logs/activities）
- 后端 TypeScript：9 个域（auth/download/upload/file/share/schedule/stats/gm/health）+ Zod 校验中间件
- OpenAPI 自动生成（zod-to-openapi）
- 四层测试金字塔：契约测试 + 单元测试 + 集成测试 + 前端组件测试
- 5 张新表补全数据模型：files/shares/schedules/schedule_logs/activities

### 迁移指南
- 见 docs/migration-v2-to-v3.md

## [2.5.0] - 2026-07-20

### ✨ 新增功能

1. **OpenAPI 规范完善**
   - 增强 `openapi.json`，添加完整的 54 个 API 端点定义
   - 添加 19 个 Schema 定义（User、Download、Upload、File、Tag、Schedule、Share 等）
   - 完善所有端点的参数、请求体和响应结构
   - 添加 bearerAuth 安全认证要求

2. **Swagger UI 集成**
   - 支持 API 可视化和在线测试
   - 提供完整的认证流程文档

3. **环境配置模板**
   - 创建 `backend/.env.example` 生产环境配置模板
   - 创建 `gm-admin/backend/.env.example` GM 管理后台配置模板
   - 包含安全配置提示和占位符

4. **Docker 容器化支持**
   - 添加 `backend/Dockerfile` 后端容器配置
   - 添加 `docker-compose.yml` 完整服务编排（MySQL + Redis + Backend）

### 🐛 修复的问题

1. **ESLint 错误修复**
   - 修复 Promise 处理错误（添加 `void` 关键字）
   - 修复 TypeScript 类型断言问题
   - 修复 switch case 变量声明错误
   - 修复未使用的导入和变量

2. **代码质量改进**
   - 添加类型安全到 localStorage 解析
   - 修复 React 19 弃用警告（forwardRef）
   - 清理未使用的代码和临时文件

### 🔧 版本对齐

1. **后端版本更新**
   - 更新 `backend/package.json` 版本号从 0.1.0 至 2.5.0
   - 更新 `backend/package-lock.json` 版本号
   - 更新 `DEPLOYMENT.md` 文档版本号
   - 更新 `database/schema.sql` 版本号
   - 更新 `healthController.js` 默认版本号

2. **版本一致性检查**
   - 前端: 2.5.0 ✅
   - 后端: 2.5.0 ✅
   - OpenAPI: 2.5.0 ✅

### ✅ 测试验证

1. **后端单元测试**
   - 31 项测试全部通过
   - 调度逻辑测试（17项）
   - 调度控制器测试（14项）

2. **前端单元测试**
   - 220 项测试全部通过

3. **端到端冒烟测试**
   - 健康检查 API ✅
   - 用户注册/登录 ✅
   - 下载任务创建 ✅
   - OpenAPI 文档 ✅

### 📖 文档更新

1. **部署指南增强**
   - 添加部署回滚预案
   - 添加 Redis 配置要求
   - 添加降级模式说明

2. **已知问题文档**
   - 创建 `KNOWN_ISSUES.md` 记录安全漏洞和技术债务

### 🔒 生产环境安全配置要求

**⚠️ 部署前必须修改以下配置**

1. **后端 `.env` 文件**
   - `JWT_SECRET`: 修改为强随机密钥（建议 32+ 字符）
   - `MYSQL_PASSWORD`: 修改为安全密码
   - `REDIS_PASSWORD`: 设置 Redis 密码
   - `UPLOAD_PATH`: 设置正确的上传目录权限

2. **GM 管理后台 `.env` 文件**
   - `GM_JWT_SECRET`: 修改为强随机密钥
   - `MYSQL_PASSWORD`: 使用独立的数据库密码
   - `GM_DEFAULT_PASSWORD`: 修改默认管理员密码

3. **安全检查清单**
   - 确保 `.env` 文件不在版本控制中（已在 `.gitignore` 中）
   - 使用 HTTPS 协议
   - 配置适当的 CORS 策略
   - 设置安全的文件上传限制
   - 配置 Rate Limiting 防止暴力攻击

---

## [0.1.0] - 初始版本

- 基础下载管理功能
- 断点续传支持
- 基本 UI 界面