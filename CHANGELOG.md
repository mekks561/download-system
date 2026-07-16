# Changelog

All notable changes to this project will be documented in this file.

## [2.5.0] - 2026-07-16

### 📖 文档更新

1. **OpenAPI 规范完善**
   - 增强 `openapi.json`，添加完整的 54 个 API 端点定义
   - 添加 19 个 Schema 定义（User、Download、Upload、File、Tag、Schedule、Share 等）
   - 完善所有端点的参数、请求体和响应结构
   - 添加 bearerAuth 安全认证要求

2. **Swagger UI 集成**
   - 支持 API 可视化和在线测试
   - 提供完整的认证流程文档

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

### 🧹 代码清理

1. **临时文件清理**
   - 删除 OpenAPI 生成过程中遗留的临时脚本文件
   - 保留 `gen_openapi.js` 作为规范生成工具

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

## [2.6.0] - 2026-07-04

### ✨ 新增功能

1. **分享功能增强**
   - 添加分享链接启用/禁用功能
   - 添加分享设置编辑功能（密码、过期时间、下载次数）
   - SharePreview 样式重构为 Tailwind CSS

2. **调度管理完善**
   - 添加调度日志查看功能（执行状态、错误信息）
   - 添加调度任务编辑功能
   - UI 优化：按钮顺序调整、样式增强

3. **拖拽上传功能**
   - 使用 Tailwind CSS 重构上传页面
   - 添加丰富的拖拽视觉反馈（悬停效果、动画、激活提示）
   - 修复拖拽事件冒泡问题

4. **统计分析增强**
   - 后端新增统计 API（/stats、/stats/trend、/stats/file-types、/stats/activities）
   - 前端调用真实 API 获取统计数据
   - 添加分享统计卡片、文件类型分布图表、最近活动列表

5. **文件管理 API**
   - 新增文件重命名、删除、移动、创建文件夹 API
   - Files.tsx 对接后端文件管理 API

### 🔧 优化改进

1. **性能优化**
   - 路由级代码分割（React.lazy + Suspense）
   - 虚拟列表优化（react-window）
   - 首屏加载优化（骨架屏、DNS预解析）

2. **UI/UX 优化**
   - 全局 Tailwind CSS 样式统一
   - 组件样式重构，移除内联 CSS
   - 响应式布局优化

### 📁 修改的文件

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `backend/src/controllers/statsController.js` | 新建 | 统计数据控制器 |
| `backend/src/controllers/fileController.js` | 新建 | 文件管理控制器 |
| `backend/src/routes/stats.js` | 新建 | 统计 API 路由 |
| `backend/src/routes/file.js` | 新建 | 文件管理 API 路由 |
| `src/components/StatsDashboard.tsx` | 修改 | 增强统计仪表盘 |
| `src/components/ScheduleManager.tsx` | 修改 | 添加日志查看和编辑功能 |
| `src/components/ShareManager.tsx` | 修改 | 添加启用/禁用和编辑功能 |
| `src/pages/Uploads.tsx` | 修改 | 重构拖拽上传区域 |
| `src/pages/Files.tsx` | 修改 | 对接后端文件管理 API |
| `src/pages/SharePreview.tsx` | 修改 | Tailwind CSS 样式重构 |

---

## [2.5.0] - 2026-06-10

### ✨ 新增功能

1. **批量下载功能**
   - 支持同时添加多个下载链接
   - 提供可展开的批量 URL 输入界面
   - 自动提取文件名或使用默认命名

2. **虚拟滚动优化**
   - 使用 react-window 实现虚拟滚动
   - 支持高效渲染大量下载任务（1000+）
   - 显著提升列表滚动流畅度

3. **深色模式支持**
   - 完整的深色主题实现
   - 支持亮色、深色、跟随系统三种模式
   - 主题状态持久化到 localStorage

4. **下载队列优先级**
   - 支持四种优先级：urgent、high、normal、low
   - 支持动态修改优先级
   - 支持按优先级排序下载

5. **即时操作反馈**
   - Toast 和 Notification 集成
   - 统一的反馈服务管理

### 🔧 优化改进

1. **断点续传优化**
   - 增强断点续传稳定性
   - 添加服务器断点续传支持检测
   - 优化 HTTP Range 请求处理

2. **网络重试机制**
   - 实现指数退避重试策略
   - 最大重试次数：3次
   - 支持可配置的重试延迟

3. **Safari 浏览器兼容**
   - 完善 Safari 浏览器下载支持
   - 针对 Desktop Safari 和 iOS Safari 提供不同方案

4. **性能优化**
   - 状态更新节流优化（100ms）
   - 使用 useMemo 缓存统计数据
   - 防止重复通知发送

### 🐛 修复的问题

1. **下载任务列表卡顿问题**
   - 优化状态更新频率
   - 减少不必要的重渲染

2. **TypeScript 类型错误修复**
   - 修复 NotificationItem 接口命名冲突
   - 修复 Input 组件缺少的 props
   - 修复数值输入的类型不匹配

3. **下载队列管理问题**
   - 修复 AbortController 处理问题
   - 确保取消请求时正确清理资源

---

## [0.1.0] - 初始版本

- 基础下载管理功能
- 断点续传支持
- 基本 UI 界面