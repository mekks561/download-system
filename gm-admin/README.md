# GM 后台管理系统

完全独立的 GM 后台管理系统，与主应用程序完全分离。

## 架构特点

- **完全独立**：独立的前端、独立的后端、独立的端口
- **权限分离**：GM 用户与普通用户完全分离，不同的认证体系
- **专用访问**：通过独立端口 (5002) 访问，客户端用户无法感知
- **严格认证**：JWT 认证 + 角色权限控制

## 目录结构

```
gm-admin/
├── backend/              # GM 后端服务
│   ├── src/
│   │   ├── config/      # 数据库配置
│   │   ├── controllers/ # 控制器
│   │   ├── middleware/  # 中间件
│   │   ├── routes/      # 路由
│   │   └── server.js    # 服务入口
│   ├── scripts/         # 初始化脚本
│   ├── .env             # 环境配置
│   └── package.json
└── frontend/            # GM 前端界面
    ├── src/
    │   ├── components/  # 组件
    │   ├── services/    # API 服务
    │   └── App.js       # 应用入口
    └── package.json
```

## 快速开始

### 1. 安装依赖

```bash
# 后端依赖
cd gm-admin/backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 2. 初始化数据库

```bash
cd gm-admin/backend
npm run init-db
```

这将创建 GM 用户表和默认超级管理员账号：
- 用户名：`admin`
- 密码：`Admin@123`
- 邮箱：`admin@example.com`

**⚠️ 重要：首次登录后请立即修改默认密码！**

### 3. 配置环境变量

编辑 `gm-admin/backend/.env` 文件：

```env
GM_PORT=5002
GM_JWT_SECRET=your-secret-key-here
GM_JWT_EXPIRES_IN=8h

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=download_manager
```

### 4. 启动服务

```bash
# 启动 GM 后端（端口 5002）
cd gm-admin/backend
npm start

# 开发模式（需要先构建前端）
# 或者分别启动前端开发服务器和后端
```

## 访问 GM 后台

打开浏览器访问：`http://localhost:5002`

使用默认管理员账号登录。

## 角色权限

系统支持四种角色，权限从低到高：

1. **viewer (查看者)**：只能查看数据
2. **moderator (版主)**：可以管理内容
3. **admin (管理员)**：可以管理用户
4. **super_admin (超级管理员)**：所有权限

## 功能模块

- 📊 **数据概览**：查看用户数、下载数、上传数等统计数据
- 👥 **用户管理**：查看和删除用户账户
- 📥 **下载记录**：查看所有用户的下载历史
- 📤 **上传记录**：查看所有用户的上传历史

## 数据库表

### gm_users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password | VARCHAR(255) | 密码（加密存储） |
| email | VARCHAR(100) | 邮箱（唯一） |
| name | VARCHAR(100) | 显示名称 |
| role | ENUM | 角色 |
| is_active | BOOLEAN | 是否启用 |
| failed_login_attempts | INT | 登录失败次数 |
| last_login_at | DATETIME | 最后登录时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 安全建议

1. 修改默认的 `GM_JWT_SECRET` 为强密码
2. 定期更换 GM 管理员密码
3. 限制 GM 后台的访问 IP
4. 使用 HTTPS 加密传输
5. 定期备份数据库

## 与主应用的关系

- **完全独立**：GM 后台与主应用是两个完全独立的系统
- **共享数据库**：都连接同一个 MySQL 数据库，但表结构分离
- **端口分离**：主应用 3001/5001，GM 后台 5002
- **用户分离**：GM 用户与普通用户不同的认证体系

## 生产部署

### 构建前端

```bash
cd gm-admin/frontend
npm run build
```

### 启动生产服务

```bash
cd gm-admin/backend
npm start
```

后端会自动提供静态文件服务（前端构建产物）。
