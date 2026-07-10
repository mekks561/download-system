# 📊 下载管理系统 - 数据库系统文档

## 1. 数据库概览

### 数据库类型
- **默认**: LowDB (JSON文件数据库)
- **可选**: MySQL 5.7+ / SQLite
- **特点**: 
  - LowDB: 轻量级、零配置、易于开发调试
  - MySQL: 支持大规模数据、高并发、专业级功能

### 版本信息
- **LowDB**: ^6.0.1
- **MySQL**: 5.7+ (推荐 MySQL 8.0+)
- **MySQL驱动**: mysql2 ^3.9.0

---

## 2. 数据库架构设计

### 2.1 项目结构
```
download-manager/
└── backend/
    ├── database/
    │   ├── db.json             # LowDB主数据库文件
    │   ├── schema.sql          # MySQL表结构定义
    │   ├── init.js             # LowDB初始化
    │   ├── init-mysql.js       # MySQL初始化
    │   ├── init-sqlite.js      # SQLite初始化
    │   ├── migrate.js          # LowDB数据迁移
    │   ├── migrate-mysql.js    # MySQL数据迁移
    │   └── migrate-sqlite.js   # SQLite数据迁移
    └── src/
        ├── config/
        │   ├── database.js     # LowDB配置
        │   └── mysql.js        # MySQL连接配置
        └── controllers/        # 各数据库控制器
```

### 2.2 环境配置

**文件**: `backend/.env`

```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database/download_manager.db
UPLOAD_PATH=./uploads

# MySQL配置 (启用MySQL时需要)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=download_manager
```

---

## 3. MySQL 安装指南

### 3.1 安装方法

#### 方法 1: 使用 MySQL Installer (推荐)
1. 访问 https://dev.mysql.com/downloads/installer/
2. 下载 `mysql-installer-community-8.0.x.msi`
3. 运行安装程序，选择 **Developer Default** 或 **Server Only**
4. 设置 root 密码（建议：`root123456` 用于测试）

#### 方法 2: 使用 Chocolatey
```powershell
choco install mysql -y
net start mysql
```

#### 方法 3: 使用 XAMPP
1. 下载 XAMPP: https://www.apachefriends.org/download.html
2. 安装时选择 MySQL 模块
3. 在 XAMPP Control Panel 中启动 MySQL

### 3.2 验证安装
```powershell
# 检查服务状态
sc query MySQL80

# 测试连接
mysql -u root -p
```

---

## 4. MySQL 迁移指南

### 4.1 快速开始

```bash
# 1. 安装依赖
cd backend
npm install

# 2. 配置 .env 文件 (添加 MySQL 配置)

# 3. 初始化数据库
node database/init-mysql.js

# 4. 迁移旧数据 (从 LowDB)
node database/migrate-mysql.js

# 5. 启动服务
npm start
```

### 4.2 数据库表结构

#### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| username | VARCHAR(50) | 用户名，唯一 |
| email | VARCHAR(100) | 邮箱，唯一 |
| password | VARCHAR(255) | bcrypt加密的密码 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### downloads 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 外键，关联 users.id |
| url | VARCHAR(2048) | 下载链接 |
| filename | VARCHAR(255) | 文件名 |
| status | ENUM | pending/downloading/completed/error/cancelled |
| progress | DECIMAL(5,2) | 进度百分比 |
| downloaded_bytes | BIGINT | 已下载字节数 |
| total_bytes | BIGINT | 总字节数 |
| speed | BIGINT | 下载速度 |
| resume_position | BIGINT | 断点续传位置 |
| created_at | DATETIME | 创建时间 |
| completed_at | DATETIME | 完成时间 |

#### uploads 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 外键，关联 users.id |
| filename | VARCHAR(255) | 服务器文件名 (UUID) |
| original_filename | VARCHAR(255) | 原始文件名 |
| file_path | VARCHAR(512) | 文件完整路径 |
| status | ENUM | pending/uploading/completed/error/cancelled |
| progress | DECIMAL(5,2) | 进度百分比 |
| uploaded_bytes | BIGINT | 已上传字节数 |
| total_bytes | BIGINT | 总字节数 |
| speed | BIGINT | 上传速度 |
| created_at | DATETIME | 创建时间 |
| completed_at | DATETIME | 完成时间 |

### 4.3 故障排除

**连接失败**:
```powershell
# 检查服务状态
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# 启动服务
Start-Service MySQL80
```

**密码错误**:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

---

## 5. LowDB 数据库结构

### 5.1 用户表 (users)
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 用户ID（时间戳） |
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | bcrypt加密密码 |
| created_at | string | 是 | 创建时间（ISO 8601） |
| updated_at | string | 是 | 更新时间（ISO 8601） |

### 5.2 下载记录表 (downloads)
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 下载记录ID（时间戳） |
| user_id | number | 是 | 用户ID（外键） |
| url | string | 是 | 下载URL |
| filename | string | 是 | 文件名 |
| status | string | 是 | pending/downloading/completed/error/cancelled |
| progress | number | 是 | 下载进度 (0-100) |
| downloaded_bytes | number | 是 | 已下载字节数 |
| total_bytes | number | 是 | 总字节数 |
| speed | number | 是 | 下载速度 (bytes/s) |
| resume_position | number | 是 | 断点续传位置 |
| created_at | string | 是 | 创建时间 |
| completed_at | string/null | 否 | 完成时间 |

### 5.3 上传记录表 (uploads)
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 上传记录ID（时间戳） |
| user_id | number | 是 | 用户ID（外键） |
| filename | string | 是 | 服务器文件名（UUID） |
| original_filename | string | 是 | 原始文件名 |
| file_path | string | 是 | 文件完整路径 |
| status | string | 是 | pending/uploading/completed/error/cancelled |
| progress | number | 是 | 上传进度 (0-100) |
| uploaded_bytes | number | 是 | 已上传字节数 |
| total_bytes | number | 是 | 总字节数 |
| speed | number | 是 | 上传速度 (bytes/s) |
| created_at | string | 是 | 创建时间 |
| completed_at | string | 是 | 完成时间 |

---

## 6. 数据库关系

```
users (用户表)
  ├── downloads (下载记录表)
  │   └── user_id → users.id (外键)
  └── uploads (上传记录表)
      └── user_id → users.id (外键)
```

**关系说明**:
- 一对多关系：一个用户可以有多个下载/上传记录
- 数据隔离：所有查询通过 `user_id` 过滤

---

## 7. 安全特性

| 特性 | 实现方式 |
|------|---------|
| 密码安全 | bcrypt (盐值轮数: 10) |
| 认证机制 | JWT (有效期: 1小时) |
| 数据隔离 | user_id 过滤 |
| SQL注入防护 | 参数化查询 |

---

## 8. 数据库对比

| 特性 | LowDB | MySQL |
|------|-------|-------|
| 数据量 | 适合小型数据 | 支持大规模数据 |
| 并发 | 有限 | 高并发支持 |
| 查询性能 | 较慢 | 快速索引查询 |
| 事务支持 | 无 | 完整支持 |
| 配置 | 零配置 | 需要安装配置 |
| 备份 | 复制文件 | 专业备份工具 |

---

## 9. GM 后台管理面板

### 功能特性
- **数据概览**: 用户总数、下载总数、上传总数、今日新增
- **用户管理**: 用户列表、统计、删除
- **下载记录**: 查看所有用户下载记录
- **上传记录**: 查看所有用户上传记录

### 访问方式
1. 启动后端和前端服务
2. 登录系统
3. 点击「🎛 GM 后台」标签页

### GM API
- `GET /api/gm/stats` - 获取系统统计
- `GET /api/gm/users` - 获取用户列表
- `GET /api/gm/downloads-all` - 获取所有下载记录
- `GET /api/gm/uploads-all` - 获取所有上传记录
- `DELETE /api/gm/users/:id` - 删除用户

---

**最后更新**: 2026-07-04