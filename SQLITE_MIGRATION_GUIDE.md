# SQLite 数据库快速迁移指南

## ✅ 完成的工作

我已经成功将下载管理系统迁移到 SQLite 数据库！

### 📋 完成的任务

1. ✅ 安装了 `better-sqlite3` 依赖
2. ✅ 创建了 SQLite 数据库配置文件 (`src/config/sqlite.js`)
3. ✅ 创建了数据库初始化脚本 (`database/init-sqlite.js`)
4. ✅ 创建了数据迁移脚本 (`database/migrate-sqlite.js`)
5. ✅ 更新了所有控制器适配 SQLite 语法
6. ✅ 更新了 `server.js` 使用 SQLite
7. ✅ 更新了 `.env` 配置文件

### 📁 新增/修改的文件

```
backend/
├── database/
│   ├── init-sqlite.js      # SQLite 初始化脚本 (新增)
│   ├── migrate-sqlite.js   # 数据迁移脚本 (新增)
│   └── download_manager.db # SQLite 数据库文件 (将自动创建)
├── src/
│   ├── config/
│   │   ├── sqlite.js      # SQLite 配置 (新增)
│   │   └── mysql.js       # MySQL 配置 (保留，可删除)
│   ├── controllers/
│   │   ├── authController.js      # 已更新
│   │   ├── downloadController.js  # 已更新
│   │   ├── uploadController.js    # 已更新
│   │   └── gmController.js         # 已更新
│   └── server.js          # 已更新
├── .env                   # 已更新
└── package.json           # 已更新
```

---

## 🚀 快速启动

### 步骤 1: 安装依赖

```powershell
cd backend
npm install
```

> ⚠️ 注意：`better-sqlite3` 需要编译。如果遇到编译错误，可能需要安装 C++ 编译工具。
> Windows 用户可能需要安装 node-gyp 和 Visual Studio Build Tools。

### 步骤 2: 初始化数据库

```powershell
node database/init-sqlite.js
```

你应该看到：

```
🚀 开始初始化SQLite数据库...

✅ SQLite数据库连接成功！
📁 数据库文件: ...\database\download_manager.db

📋 初始化数据库表结构...
✅ 数据库表创建成功！

🎉 SQLite数据库初始化完成！
```

### 步骤 3: 迁移旧数据 (可选)

如果你有 LowDB 的旧数据：

```powershell
node database/migrate-sqlite.js
```

### 步骤 4: 启动后端服务

```powershell
npm start
```

你应该看到：

```
🚀 启动下载管理系统后端服务...

📦 初始化SQLite数据库...
✅ SQLite数据库连接成功！
📁 数据库文件: ...\database\download_manager.db

✅ 服务器启动成功！
🌐 后端API地址: http://localhost:5001
📁 SQLite数据库: backend/database/download_manager.db

🎉 准备就绪！
```

### 步骤 5: 启动前端

```powershell
# 在另一个终端
cd ..
npm start
```

---

## 📊 SQLite 数据库特点

### 优势

- ✅ **零配置** - 无需安装数据库服务器
- ✅ **快速** - 比文件数据库快得多
- ✅ **轻量级** - 库文件很小
- ✅ **可靠** - 支持 ACID 事务
- ✅ **可移植** - 单个文件包含所有数据
- ✅ **支持 SQL** - 完整的 SQL 语法支持
- ✅ **易于备份** - 直接复制 `.db` 文件

### 限制

- ⚠️ **单用户** - 不适合高并发场景
- ⚠️ **文件锁** - 同一时间只有一个写入操作
- ⚠️ **大小限制** - 最大约 281 TB (实际受限)

---

## 🎛 GM 后台管理面板

GM 后台管理面板已更新为使用 SQLite 数据库！

访问地址：http://localhost:3000 → 点击「🎛 GM 后台」

---

## 📝 常见问题

### 问题 1: `better-sqlite3` 编译失败

**错误信息：**
```
error MSB8020: cannot find v143 build tools...
```

**解决方案：**

1. 安装 Visual Studio Build Tools
2. 或使用预编译的二进制文件

### 问题 2: 数据库文件无法创建

**解决方案：**

```powershell
mkdir backend\database
mkdir backend\uploads
```

### 问题 3: 端口被占用

**解决方案：**

修改 `backend/.env` 中的 `PORT`：

```env
PORT=5002
```

---

## 🔄 从 SQLite 迁移到 MySQL

如果以后需要迁移到 MySQL：

1. 安装 MySQL
2. 更新 `backend/package.json`，将 `better-sqlite3` 替换为 `mysql2`
3. 使用 `database/init.js` 初始化 MySQL 数据库
4. 使用 `database/migrate.js` 迁移数据
5. 更新 `backend/src/server.js` 使用 MySQL 配置

---

## 🎉 完成！

恭喜！SQLite 数据库迁移已完成！

现在你可以：

1. ✅ 启动后端服务：`cd backend && npm start`
2. ✅ 启动前端应用：`npm start`
3. ✅ 访问系统：http://localhost:3000
4. ✅ 使用 GM 后台管理面板
5. ✅ 测试所有功能

---

## 📚 相关文档

- [数据库系统文档](./DATABASE_SYSTEM.md)
- [MySQL 安装指南](./MYSQL_INSTALLATION_GUIDE.md) (如需迁移到 MySQL)
- [网络请求验证报告](./NETWORK_VERIFICATION_REPORT.md)

---

**有任何问题请随时告诉我！** 🚀
