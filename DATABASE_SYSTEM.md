# 📊 下载管理系统 - 数据库系统文档

## 1. 数据库概览

### 数据库类型
- **类型**: LowDB (JSON文件数据库)
- **版本**: 6.0.1
- **存储方式**: 文件系统存储 (JSON格式)
- **特点**: 轻量级、无需单独数据库服务、易于开发和调试

### 版本信息
- **LowDB 版本**: ^6.0.1
- **Node.js 要求**: 任意支持ES6+的版本

---

## 2. 数据库架构设计

### 2.1 数据库文件位置
```
download-manager/
└── backend/
    ├── database/
    │   └── db.json           # 主数据库文件
    └── src/
        └── config/
            └── database.js    # 数据库配置和连接
```

### 2.2 数据库配置文件

**文件路径**: [backend/src/config/database.js](file:///h:/工作区/download-manager/backend/src/config/database.js)

```javascript
const dbPath = path.join(__dirname, '../../database/db.json');
const defaultData = {
  users: [],
  downloads: [],
  uploads: []
};
```

**环境配置** ([backend/.env](file:///h:/工作区/download-manager/backend/.env)):
```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database/download_manager.db
UPLOAD_PATH=./uploads
```

---

## 3. 数据库表结构

### 3.1 用户表 (users)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 用户ID（时间戳生成） |
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 加密后的密码（bcrypt） |
| created_at | string | 是 | 创建时间（ISO 8601） |
| updated_at | string | 是 | 更新时间（ISO 8601） |

**示例数据**:
```json
{
  "id": 1780139525628,
  "username": "1",
  "email": "598763674@qq.com",
  "password": "$2a$10$GOn/6YdFQ1LVO/yHuiq6Ruyk0NGZUMzj42/XeqFyqf8H1yp4dktfC",
  "created_at": "2026-05-30T11:12:05.628Z",
  "updated_at": "2026-05-30T11:12:05.628Z"
}
```

---

### 3.2 下载记录表 (downloads)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 下载记录ID（时间戳生成） |
| user_id | number | 是 | 用户ID（外键） |
| url | string | 是 | 下载URL |
| filename | string | 是 | 文件名 |
| status | string | 是 | 状态：pending/downloading/completed/error/cancelled |
| progress | number | 是 | 下载进度 (0-100) |
| downloaded_bytes | number | 是 | 已下载字节数 |
| total_bytes | number | 是 | 总字节数 |
| speed | number | 是 | 下载速度 (bytes/s) |
| resume_position | number | 是 | 断点续传位置 |
| created_at | string | 是 | 创建时间（ISO 8601） |
| completed_at | string/null | 否 | 完成时间（ISO 8601） |

**示例数据**:
```json
{
  "id": 1780139525630,
  "user_id": 1780139525628,
  "url": "https://example.com/file.pdf",
  "filename": "file.pdf",
  "status": "completed",
  "progress": 100,
  "downloaded_bytes": 13264,
  "total_bytes": 13264,
  "speed": 22568,
  "resume_position": 0,
  "created_at": "2026-05-30T11:12:05.630Z",
  "completed_at": "2026-05-30T11:12:30.234Z"
}
```

---

### 3.3 上传记录表 (uploads)

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 上传记录ID（时间戳生成） |
| user_id | number | 是 | 用户ID（外键） |
| filename | string | 是 | 服务器上的文件名（UUID） |
| original_filename | string | 是 | 原始文件名 |
| file_path | string | 是 | 文件在服务器的完整路径 |
| status | string | 是 | 状态：pending/uploading/completed/error/cancelled |
| progress | number | 是 | 上传进度 (0-100) |
| uploaded_bytes | number | 是 | 已上传字节数 |
| total_bytes | number | 是 | 总字节数 |
| speed | number | 是 | 上传速度 (bytes/s) |
| created_at | string | 是 | 创建时间（ISO 8601） |
| completed_at | string | 是 | 完成时间（ISO 8601） |

**示例数据**:
```json
{
  "id": 1780139525631,
  "user_id": 1780139525628,
  "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
  "original_filename": "profile.png",
  "file_path": "h:\\工作区\\download-manager\\backend\\uploads\\a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
  "status": "completed",
  "progress": 100,
  "uploaded_bytes": 524288,
  "total_bytes": 524288,
  "speed": 0,
  "created_at": "2026-05-30T11:12:05.631Z",
  "completed_at": "2026-05-30T11:12:30.235Z"
}
```

---

## 4. 表之间的关系定义

### 4.1 关系图
```
users (用户表)
  ├── downloads (下载记录表)
  │   └── user_id → users.id (外键)
  └── uploads (上传记录表)
      └── user_id → users.id (外键)
```

### 4.2 关系说明
- **一对多关系**: 一个用户可以有多个下载记录和多个上传记录
- **外键约束**: 通过 `user_id` 字段关联到 `users.id`
- **访问控制**: 所有数据访问都通过 `user_id` 进行过滤，确保数据隔离

---

## 5. 初始测试数据

### 5.1 当前数据库状态

**文件**: [backend/database/db.json](file:///h:/工作区/download-manager/backend/database/db.json)

当前包含:
- ✅ 1个测试用户
- ✅ 空下载记录
- ✅ 空上传记录

**完整数据**:
```json
{
  "users": [
    {
      "id": 1780139525628,
      "username": "1",
      "email": "598763674@qq.com",
      "password": "$2a$10$GOn/6YdFQ1LVO/yHuiq6Ruyk0NGZUMzj42/XeqFyqf8H1yp4dktfC",
      "created_at": "2026-05-30T11:12:05.628Z",
      "updated_at": "2026-05-30T11:12:05.628Z"
    }
  ],
  "downloads": [],
  "uploads": []
}
```

---

## 6. 数据库操作相关代码模块

### 6.1 配置模块
- **文件**: [backend/src/config/database.js](file:///h:/工作区/download-manager/backend/src/config/database.js)
- **功能**: 数据库连接、初始化、默认数据设置

### 6.2 用户认证控制器
- **文件**: [backend/src/controllers/authController.js](file:///h:/工作区/download-manager/backend/src/controllers/authController.js)
- **功能**: 用户注册、登录、获取用户信息
- **加密**: bcrypt (密码哈希)
- **认证**: JWT (JSON Web Token)

### 6.3 下载记录控制器
- **文件**: [backend/src/controllers/downloadController.js](file:///h:/工作区/download-manager/backend/src/controllers/downloadController.js)
- **功能**: CRUD操作、清空已完成记录

### 6.4 上传记录控制器
- **文件**: [backend/src/controllers/uploadController.js](file:///h:/工作区/download-manager/backend/src/controllers/uploadController.js)
- **功能**: 文件上传、CRUD操作、文件系统管理
- **上传处理**: multer (最大100MB)

---

## 7. 数据库访问方式

### 7.1 CRUD操作示例

#### 读取数据
```javascript
await db.read();
const users = db.data.users;
const downloads = db.data.downloads.filter(d => d.user_id === userId);
```

#### 写入数据
```javascript
const newUser = { id: Date.now(), username: 'test', ... };
db.data.users.push(newUser);
await db.write();
```

#### 更新数据
```javascript
const index = db.data.downloads.findIndex(d => d.id === id);
db.data.downloads[index].status = 'completed';
await db.write();
```

#### 删除数据
```javascript
const index = db.data.uploads.findIndex(u => u.id === id);
db.data.uploads.splice(index, 1);
await db.write();
```

---

## 8. 安全特性

### 8.1 密码安全
- **算法**: bcrypt
- **盐值轮数**: 10
- **存储**: 哈希后存储，不存储明文密码

### 8.2 认证机制
- **类型**: JWT (JSON Web Token)
- **有效期**: 1小时
- **加密密钥**: 环境变量配置

### 8.3 数据隔离
- **用户隔离**: 所有查询都通过 `user_id` 过滤
- **权限控制**: 中间件验证JWT令牌

---

## 9. 扩展性和优化

### 9.1 当前优势
- ✅ 零配置，开箱即用
- ✅ 易于调试（JSON格式可读）
- ✅ 无需单独数据库服务
- ✅ 适合小型应用和开发环境

### 9.2 生产环境建议
如需迁移到生产环境，建议考虑:
- **PostgreSQL** (关系型数据库)
- **MongoDB** (NoSQL数据库)
- **MySQL** (传统关系型数据库)

**迁移时需要改动**:
1. 替换数据库配置文件
2. 重写控制器中的数据库操作
3. 添加ORM层（如Sequelize、Mongoose）

---

## 10. 维护和备份

### 10.1 备份策略
- **备份文件**: `backend/database/db.json`
- **备份频率**: 建议定期备份
- **备份方法**: 直接复制文件

### 10.2 恢复方法
- **恢复文件**: 替换 `db.json` 文件
- **注意事项**: 恢复前停止服务

---

## 总结

| 项目 | 状态 |
|------|------|
| 数据库类型 | ✅ LowDB (JSON文件) |
| 数据库架构 | ✅ 3个核心表 |
| 表结构设计 | ✅ 完整字段定义 |
| 表关系定义 | ✅ 一对多关系 |
| 初始测试数据 | ✅ 1个用户已创建 |
| 连接配置文件 | ✅ .env + database.js |
| 操作代码模块 | ✅ 3个完整控制器 |
| 安全特性 | ✅ bcrypt + JWT |

✅ **数据库系统完整且功能正常！**
