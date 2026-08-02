# 下载管理系统 - 功能规范

## 项目概述

**项目名称**: Download Manager
**当前版本**: 3.0.0
**技术栈**: pnpm workspaces monorepo（apps/web + apps/api + packages/shared）

### 技术栈
- **项目结构**：pnpm workspaces monorepo（apps/web + apps/api + packages/shared）
- **后端**：TypeScript + Express 4 + Prisma 6 + MySQL 8 + Zod 4
- **前端**：React 19 + Vite 8 + TypeScript 6 + Zod 4（从 @dm/shared 导入）
- **共享**：@dm/shared Zod schema 契约层（单一真相源）
- **测试**：Vitest 4（前后端统一）
- **API 文档**：OpenAPI 自动生成（zod-to-openapi）

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
backend/
├── src/
│   ├── controllers/  # 控制器
│   ├── routes/       # 路由
│   └── middleware/   # 中间件
└── database/         # 数据库配置和迁移
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

## 性能优化

- 虚拟滚动（react-window）支持 10000+ 条数据
- 代码分割（React.lazy + Suspense）
- React.memo、useMemo、useCallback 优化
- 骨架屏加载

## 安全特性

- JWT 令牌认证
- API 访问频率限制
- SQL 注入防护
- XSS 攻击防护
- 文件类型白名单验证

**最后更新**: 2026-08-01