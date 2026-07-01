# MySQL 数据库迁移指南

## 📋 概述

本指南说明了如何将下载管理系统从 LowDB (JSON 文件数据库) 迁移到 MySQL 数据库，并使用新开发的 GM 后台管理面板。

---

## 🚀 快速开始

### 1. 环境要求

- Node.js v16 或更高版本
- MySQL 5.7 或更高版本 (推荐 MySQL 8.0+)
- npm 或 yarn 包管理器

### 2. 安装 MySQL 依赖

后端已配置好 `mysql2` 包，进入 backend 目录安装依赖：

```bash
cd backend
npm install
```

### 3. 配置环境变量

编辑 `backend/.env` 文件，配置 MySQL 连接信息：

```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_PATH=./uploads

# MySQL 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=download_manager
```

### 4. 初始化 MySQL 数据库

有两种方式初始化数据库：

#### 方式 A: 使用 Node.js 脚本 (推荐)

```bash
cd backend
node database/init.js
```

这个脚本会：
- 连接到 MySQL 服务器
- 创建 `download_manager` 数据库 (如果不存在)
- 创建所有必要的数据表

#### 方式 B: 手动执行 SQL

使用 MySQL 客户端工具 (如 MySQL Workbench, phpMyAdmin, 或命令行) 执行 `backend/database/schema.sql` 文件：

```bash
mysql -u root -p < backend/database/schema.sql
```

### 5. 从 LowDB 迁移数据

如果你之前有 LowDB 的数据，可以运行迁移脚本：

```bash
cd backend
node database/migrate.js
```

这个脚本会：
- 读取 `database/db.json` 文件中的数据
- 将用户、下载记录、上传记录迁移到 MySQL
- 跳过已存在的记录以避免重复

---

## 📊 数据库表结构

### users 表 (用户表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| username | VARCHAR(50) | 用户名，唯一 |
| email | VARCHAR(100) | 邮箱，唯一 |
| password | VARCHAR(255) | bcrypt 加密的密码 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### downloads 表 (下载记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 外键，关联 users.id |
| url | VARCHAR(2048) | 下载链接 |
| filename | VARCHAR(255) | 文件名 |
| status | ENUM | 状态 (pending/downloading/completed/error/cancelled) |
| progress | DECIMAL(5,2) | 进度百分比 |
| downloaded_bytes | BIGINT | 已下载字节数 |
| total_bytes | BIGINT | 总字节数 |
| speed | BIGINT | 下载速度 |
| resume_position | BIGINT | 断点续传位置 |
| created_at | DATETIME | 创建时间 |
| completed_at | DATETIME | 完成时间 |

### uploads 表 (上传记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 外键，关联 users.id |
| filename | VARCHAR(255) | 服务器上的文件名 (UUID) |
| original_filename | VARCHAR(255) | 原始文件名 |
| file_path | VARCHAR(512) | 文件完整路径 |
| status | ENUM | 状态 (pending/uploading/completed/error/cancelled) |
| progress | DECIMAL(5,2) | 进度百分比 |
| uploaded_bytes | BIGINT | 已上传字节数 |
| total_bytes | BIGINT | 总字节数 |
| speed | BIGINT | 上传速度 |
| created_at | DATETIME | 创建时间 |
| completed_at | DATETIME | 完成时间 |

---

## 🎛 GM 后台管理面板

### 功能特性

1. **数据概览**
   - 显示用户总数、下载总数、上传总数
   - 显示今日新增数据
   - 下载状态分布统计

2. **用户管理**
   - 查看所有用户列表
   - 查看用户下载/上传统计
   - 删除用户 (级联删除相关数据)

3. **下载记录管理**
   - 查看所有用户的下载记录
   - 显示下载详情和状态

4. **上传记录管理**
   - 查看所有用户的上传记录
   - 显示文件信息和状态

### 如何访问 GM 后台

1. 启动后端和前端服务
2. 登录系统 (注册新用户或使用现有账号)
3. 在主界面点击「🎛 GM 后台」标签页

---

## 🔧 启动服务

### 启动后端

```bash
cd backend
npm start
```

后端将在 `http://localhost:5001` 运行

### 启动前端

在另一个终端：

```bash
cd download-manager
npm start
```

前端将在 `http://localhost:3000` 运行

---

## 📝 API 变更

从 LowDB 迁移到 MySQL 后，API 保持不变，包括：

- 用户认证 API
- 下载管理 API
- 上传管理 API
- 新增: GM 后台 API

### 新增 GM API

- `GET /api/gm/stats` - 获取系统统计
- `GET /api/gm/users` - 获取用户列表
- `GET /api/gm/downloads-all` - 获取所有下载记录
- `GET /api/gm/uploads-all` - 获取所有上传记录
- `DELETE /api/gm/users/:id` - 删除用户

---

## 🔍 故障排除

### MySQL 连接失败

如果遇到连接错误，请检查：

1. MySQL 服务是否正在运行
2. 连接参数 (host, port, username, password) 是否正确
3. 防火墙是否允许连接
4. 用户是否有足够的权限

Windows 用户可以检查 MySQL 服务：

```powershell
# 检查 MySQL 服务状态
Get-Service | Where-Object {$_.Name -like "*mysql*"}
```

### 数据库不存在

运行初始化脚本创建数据库和表：

```bash
cd backend
node database/init.js
```

### 数据迁移失败

确保 `database/db.json` 文件存在且格式正确。如果没有旧数据，迁移脚本会安全地跳过。

---

## 📦 项目结构变更

```
download-manager/
├── backend/
│   ├── database/
│   │   ├── db.json          # 旧的 LowDB 文件 (保留用于迁移)
│   │   ├── schema.sql       # MySQL 表结构
│   │   ├── init.js          # 数据库初始化脚本
│   │   └── migrate.js       # 数据迁移脚本
│   ├── src/
│   │   ├── config/
│   │   │   └── mysql.js     # MySQL 连接配置 (新增)
│   │   ├── controllers/
│   │   │   ├── gmController.js  # GM 后台控制器 (新增)
│   │   │   └── ...          # 其他控制器已更新
│   │   ├── routes/
│   │   │   └── api.js       # 已更新，包含 GM 路由
│   │   └── server.js        # 已更新，测试 MySQL 连接
│   ├── .env                 # 已更新，包含 MySQL 配置
│   └── package.json         # 已更新，依赖 mysql2
├── src/
│   ├── components/
│   │   └── GMAdminPanel.jsx     # GM 后台组件 (新增)
│   └── services/
│       └── GMService.js         # GM API 服务 (新增)
└── MYSQL_MIGRATION_GUIDE.md  # 本文档
```

---

## 🌟 优势对比

| 特性 | LowDB | MySQL |
|------|-------|-------|
| 数据量 | 适合小型数据 | 支持大规模数据 |
| 并发 | 有限 | 高并发支持 |
| 查询性能 | 较慢 | 快速索引查询 |
| 事务支持 | 无 | 完整支持 |
| 数据安全 | 文件级别 | 用户权限+加密 |
| 备份 | 复制文件 | 专业备份工具 |
| 扩展性 | 有限 | 高可扩展 |

---

## 📞 下一步

迁移完成后，你可以：

1. 测试所有现有功能是否正常
2. 使用 GM 后台管理面板查看和管理数据
3. 考虑优化 MySQL 配置以提高性能
4. 设置定期备份策略

---

## 📚 相关文档

- [数据库系统文档](./DATABASE_SYSTEM.md)
- [网络请求验证报告](./NETWORK_VERIFICATION_REPORT.md)
