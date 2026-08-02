# v2 → v3 迁移指南

## 概述
v3.0.0 是破坏性版本，从 LowDB/JS 架构迁移到 Prisma/TS/monorepo 架构。

## 前置条件
- Node.js >= 20
- pnpm >= 10
- MySQL 8.0+

## 步骤

### 1. 备份旧数据
```bash
cp backend/database/db.json db.json.backup
mysqldump -u root -p download_manager > mysql_backup.sql
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置环境变量
编辑 `apps/api/.env`：
```
DATABASE_URL="mysql://用户名:密码@localhost:3306/download_manager"
JWT_SECRET=your-secret
PORT=5001
```

### 4. 迁移数据库
```bash
pnpm db:migrate
```

### 5. 迁移旧数据（如有 LowDB db.json）
```bash
mkdir -p apps/api/legacy-data
cp db.json.backup apps/api/legacy-data/db.json
cd apps/api && npx tsx scripts/migrate-legacy-data.ts
```

### 6. 种子数据
```bash
pnpm db:seed
```
创建测试账号：admin@dm.local / user@dm.local（密码 admin123）

### 7. 启动服务
```bash
pnpm dev:api   # 后端 :5001
pnpm dev:web   # 前端 :3001
```

## 回滚
- 恢复 db.json.backup 到 backend/database/db.json
- 恢复 mysql_backup.sql
- git checkout v2.6.0
