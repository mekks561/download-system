# Download Manager Backend - 部署指南

## 📋 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [部署方式](#部署方式)
- [服务管理](#服务管理)
- [监控与日志](#监控与日志)
- [健康检查](#健康检查)
- [故障排除](#故障排除)

---

## 🚀 快速开始

### Windows 环境

```bash
cd backend
.\scripts\deploy.bat
```

### Linux/Mac 环境

```bash
cd backend
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 📦 环境要求

### 最小要求（必选）

- **Node.js**: >= 16.0.0
- **MySQL**: >= 8.0
- **npm**: >= 8.0

### 推荐配置（生产环境）

- **PM2**: >= 5.0（进程管理器）
- **Docker**: >= 20.0（容器化部署）

### 安装 Node.js

访问 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本。

### 安装 PM2 (推荐)

```bash
npm install -g pm2
```

### 安装 Docker (推荐)

**Windows**:
1. 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. 安装并启动 Docker Desktop
3. 确保 Docker 服务正在运行

**Linux**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin
```

---

## 🔧 安装步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_PATH=./uploads

# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=download_manager
```

### 3. 初始化数据库

```bash
# 初始化基础数据库
npm run init-db

# 初始化下载计划调度表
npm run init-scheduler
```

---

## 🚀 部署方式

### 方式一：直接运行（开发环境）

```bash
# 启动后端API
npm start

# 启动调度引擎（另一个终端）
npm run scheduler
```

### 方式二：PM2 进程管理（推荐）

```bash
# 一键部署所有服务
npm run pm2:start

# 或分别启动
pm2 start ecosystem.config.cjs
```

### 方式三：开发模式

```bash
# 启用热重载开发
npm run dev
```

### 方式四：Docker 容器化部署（推荐生产环境）

> **前提条件**: 已安装 Docker 和 Docker Compose

```bash
# 1. 从项目根目录启动所有服务
cd ..
docker-compose up -d

# 2. 查看日志
docker-compose logs -f

# 3. 停止服务
docker-compose down

# 4. 重新构建并启动
docker-compose up -d --build
```

**Docker 服务说明**:

| 服务 | 端口 | 说明 |
|------|------|------|
| `download-manager-backend` | 5001 | 后端 API 服务 |
| `download-manager-mysql` | 3306 | MySQL 数据库 |

**Docker 环境配置**:

创建 `.env` 文件（与 docker-compose.yml 同目录）：

```env
JWT_SECRET=your-super-secret-jwt-key
MYSQL_PASSWORD=your_secure_mysql_password
```

> **注意**: Docker 部署会自动初始化数据库和调度表，无需手动执行 `npm run init-db`。

---

## ⚙️ 服务管理

### 启动服务

```bash
# 使用 PM2 启动
npm run pm2:start

# 或使用 npm
npm start
```

### 停止服务

```bash
# 使用 PM2 停止
npm run pm2:stop

# 或停止所有 PM2 进程
pm2 stop all
```

### 重启服务

```bash
npm run pm2:restart
```

### 查看状态

```bash
npm run pm2:status
```

### 查看日志

```bash
# 查看所有日志
npm run pm2:logs

# 实时监控
npm run pm2:monit
```

### 删除所有进程

```bash
npm run pm2:delete
```

---

## 📊 监控与日志

### API 端点

#### 健康检查

```bash
GET http://localhost:5001/api/health
```

响应示例：
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-31T10:00:00.000Z",
  "service": "download-manager-api",
  "version": "2.5.0"
}
```

#### 系统指标

```bash
GET http://localhost:5001/api/metrics
```

响应示例：
```json
{
  "success": true,
  "timestamp": "2026-05-31T10:00:00.000Z",
  "metrics": {
    "database": {
      "downloads": 150,
      "uploads": 80,
      "users": 25,
      "schedules": 10
    },
    "system": {
      "uptime": 3600,
      "uptimeFormatted": "1h 0m 0s",
      "memory": {
        "rss": "120 MB",
        "heapUsed": "80 MB",
        "heapTotal": "150 MB"
      },
      "nodeVersion": "v18.16.0",
      "platform": "win32",
      "arch": "x64"
    }
  }
}
```

### 日志文件

日志文件位于 `backend/logs/` 目录：

- `info.log` - 信息日志
- `warn.log` - 警告日志
- `error.log` - 错误日志
- `debug.log` - 调试日志（仅开发环境）
- `pm2-error.log` - PM2 错误日志
- `pm2-out.log` - PM2 输出日志
- `pm2-combined.log` - PM2 合并日志

### PM2 日志管理

```bash
# 查看实时日志
pm2 logs

# 查看特定进程日志
pm2 logs download-manager-api

# 清空日志
pm2 flush

# 导出日志
pm2 logs --lines 1000 --nostream > logs-export.log
```

---

## ✅ 健康检查

### Windows 健康检查脚本

```bash
.\scripts\health-check.bat
```

### 手动健康检查

```bash
# 检查健康状态
curl http://localhost:5001/api/health

# 检查指标
curl http://localhost:5001/api/metrics
```

### 健康检查频率建议

- **生产环境**：每 5 分钟检查一次
- **开发环境**：按需检查

---

## 🛠 故障排除

### 数据库连接失败

1. 检查 MySQL 服务是否运行
2. 验证 `.env` 中的数据库配置
3. 确认数据库已创建

```bash
# 测试数据库连接
mysql -h localhost -u root -p -e "SHOW DATABASES;"
```

### 端口被占用

```bash
# Windows: 查找占用端口的进程
netstat -ano | findstr :5001

# 结束进程
taskkill /PID <PID> /F
```

### PM2 进程异常

```bash
# 查看 PM2 错误日志
pm2 logs --err

# 重置 PM2
pm2 reset all

# 查看详细信息
pm2 describe download-manager-api
```

### 依赖安装失败

```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

---

## 📝 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm start` | 启动后端API |
| `npm run dev` | 开发模式启动 |
| `npm run scheduler` | 启动调度引擎 |
| `npm run pm2:start` | PM2 启动所有服务 |
| `npm run pm2:stop` | PM2 停止所有服务 |
| `npm run pm2:restart` | PM2 重启所有服务 |
| `npm run pm2:status` | 查看 PM2 状态 |
| `npm run pm2:logs` | 查看 PM2 日志 |
| `npm test` | 运行测试 |
| `npm run init-db` | 初始化数据库 |
| `npm run init-scheduler` | 初始化调度表 |

---

## 🔄 部署回滚预案

### 回滚前准备

在部署新版本前，执行以下备份操作：

```bash
# 1. 备份数据库
mysqldump -u root -p download_manager > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# 3. 记录当前版本号
git log --oneline -1 > current_version.txt

# 4. 停止服务
npm run pm2:stop
```

### 快速回滚步骤

**场景一：代码问题（无需回滚数据库）**

```bash
# 1. 切换到上一个稳定版本
git checkout <previous-tag>

# 2. 重新安装依赖（如果有变更）
npm install

# 3. 启动服务
npm run pm2:start

# 4. 验证服务状态
npm run pm2:status
curl http://localhost:5001/api/health
```

**场景二：数据库迁移问题**

```bash
# 1. 停止服务
npm run pm2:stop

# 2. 恢复数据库备份
mysql -u root -p download_manager < backup_YYYYMMDD_HHMMSS.sql

# 3. 切换到上一个稳定版本
git checkout <previous-tag>

# 4. 重新安装依赖
npm install

# 5. 启动服务
npm run pm2:start

# 6. 验证数据完整性
curl http://localhost:5001/api/health
curl http://localhost:5001/api/metrics
```

### 回滚验证清单

- [ ] 健康检查 API 返回正常 (`/api/health`)
- [ ] 系统指标 API 返回正常 (`/api/metrics`)
- [ ] 用户认证流程正常（登录/注册）
- [ ] 核心业务功能正常（下载/上传）
- [ ] 数据库连接正常

### 版本标签管理

```bash
# 创建版本标签（部署前）
git tag v2.5.0
git push origin v2.5.0

# 查看所有标签
git tag -l

# 删除错误标签
git tag -d v2.5.0
git push origin :v2.5.0
```

---

## 💾 缓存说明（v3.1.0 起）

缓存由进程内的 **MemoryCache**（`src/services/cache.service.ts`，Map + TTL）提供，**不需要 Redis 等外部服务**。

- **单实例部署**：缓存随进程存活，重启即失效（对当前用途无影响）。
- **多实例部署（PM2 cluster / 多容器）**：各实例缓存相互独立，命中率下降但功能正常；如需跨实例共享缓存，再引入 Redis 并改造 `cache.service.ts` 即可（接口已保持稳定，调用点无需改动）。
- **限流**：由 `express-rate-limit` 在进程内实现，同样不依赖外部存储。

---

## 🔐 安全建议

1. **修改默认密码**：更改 `.env` 中的 `JWT_SECRET` 和数据库密码
2. **启用 HTTPS**：生产环境建议使用 HTTPS
3. **配置防火墙**：限制数据库访问权限
4. **定期备份**：定期备份数据库和上传文件
5. **监控告警**：配置异常告警机制

---

## 📞 技术支持

如遇问题，请检查：

1. [GitHub Issues](https://github.com/your-repo/issues)
2. [官方文档](https://docs.your-site.com)
3. [社区论坛](https://forum.your-site.com)

---

**版本**: 2.5.0  
**最后更新**: 2026-07-17  
**维护者**: 开发团队
