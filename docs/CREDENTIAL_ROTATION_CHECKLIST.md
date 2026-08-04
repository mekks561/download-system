# 密钥轮换清单

> **背景**：2026-08-03 发现 `.env` 文件（含真实凭据）曾被提交到 git 历史并推送到 GitHub。已通过 `git filter-repo` 清理历史并强制推送，但**已泄露的凭据应视为永久泄露**，必须轮换。
>
> **生成时间**：2026-08-04
> **备份**：`download-manager-backup-20260803.bundle`

---

## 🔴 优先级 P0 — 立即轮换（真实凭据曾泄露于 git 历史）

### 1. MySQL root 密码
- **泄露值**：`123456`
- **泄露位置**：`apps/api/.env`、`gm-admin/backend/.env`、旧 `backend/.env`、旧根 `.env`
- **影响**：数据库完全控制权（root 用户，所有数据库）
- **使用位置**：
  - `apps/api/.env` → `MYSQL_PASSWORD`、`DATABASE_URL`（`mysql://root:123456@...`）
  - `gm-admin/backend/.env` → `MYSQL_PASSWORD`
- **轮换步骤**：
  ```sql
  -- 登录 MySQL 后执行
  ALTER USER 'root'@'localhost' IDENTIFIED BY '<新强密码>';
  FLUSH PRIVILEGES;
  ```
- **同步更新配置**：
  - `apps/api/.env`：`MYSQL_PASSWORD` 和 `DATABASE_URL` 中的密码部分
  - `gm-admin/backend/.env`：`MYSQL_PASSWORD`

---

### 2. API JWT 密钥
- **泄露值**：`your-super-secret-jwt-key-change-this-in-production`
- **泄露位置**：`apps/api/.env`、旧 `backend/.env`
- **影响**：攻击者可伪造任意用户的 JWT token，冒充任何用户登录 API
- **使用位置**：`apps/api/.env` → `JWT_SECRET`
- **轮换步骤**：
  ```bash
  # 生成新密钥（64 字符）
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  将输出填入 `apps/api/.env` 的 `JWT_SECRET`
- **副作用**：轮换后所有现有 JWT token 立即失效，用户需重新登录

---

### 3. GM 后台 JWT 密钥
- **泄露值**：`gm-super-secret-key-change-this-in-production-2024`
- **泄露位置**：`gm-admin/backend/.env`
- **影响**：攻击者可伪造 GM 后台管理员 JWT token，获得后台完全控制权
- **使用位置**：`gm-admin/backend/.env` → `GM_JWT_SECRET`
- **轮换步骤**：
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  将输出填入 `gm-admin/backend/.env` 的 `GM_JWT_SECRET`
- **副作用**：轮换后所有 GM 后台登录会话失效

---

### 4. GM 默认管理员密码
- **泄露值**：`Admin@123`
- **泄露位置**：`gm-admin/backend/.env`
- **影响**：GM 后台 `super_admin` 账户登录权限（由 `init-gm-db.js` 写入数据库）
- **使用位置**：
  - `gm-admin/backend/.env` → `GM_DEFAULT_PASSWORD`
  - 数据库 `gm_users` 表中 `admin` 账户的密码哈希
- **轮换步骤**：
  1. **改数据库**（最重要）：登录 GM 后台修改密码，或直接 SQL 更新：
     ```sql
     -- 先生成新哈希（bcrypt，rounds=12）
     -- 在 Node 中执行：node -e "console.log(require('bcryptjs').hashSync('新密码', 12))"
     UPDATE gm_users SET password = '<新bcrypt哈希>' WHERE username = 'admin';
     ```
  2. **改配置**：更新 `gm-admin/backend/.env` 的 `GM_DEFAULT_PASSWORD`（防止重新初始化时再次写入旧密码）

---

## 🟠 优先级 P1 — 源码中的硬编码凭据（仍在仓库中，未被 filter-repo 清理）

> ⚠️ 以下凭据位于**已跟踪的源码文件**中，filter-repo 只移除了 `.env` 文件，这些仍存在于本地与远端历史。

### 5. Prisma seed 脚本中的管理员密码
- **泄露值**：`admin123`
- **泄露位置**：`apps/api/prisma/seed.ts:7`（`bcrypt.hash('admin123', 10)`）
- **影响账户**：`admin@dm.local` / 用户名 `admin`（role: `admin`）
- **当前状态**：**仍在源码中**，远端历史也包含
- **轮换步骤**：
  1. **改数据库**：修改 `admin@dm.local` 账户密码（通过 API 的改密功能或 SQL）
     ```sql
     -- 生成新哈希：node -e "console.log(require('bcryptjs').hashSync('新密码', 10))"
     UPDATE users SET password = '<新bcrypt哈希>' WHERE email = 'admin@dm.local';
     ```
  2. **改源码**：将 `seed.ts` 中的硬编码密码改为从环境变量读取：
     ```typescript
     const seedPassword = process.env.SEED_ADMIN_PASSWORD;
     if (!seedPassword) throw new Error('SEED_ADMIN_PASSWORD 未设置');
     const password = await bcrypt.hash(seedPassword, 10);
     ```
  3. **提交并推送**源码修改
  4. （可选）若要彻底从历史移除，需再次运行 `git filter-repo --replace-text`

---

### 6. GM 初始化脚本的硬编码回退默认值
- **泄露值**：`Admin@123`（密码）、`admin`（用户名）、`admin@example.com`（邮箱）
- **泄露位置**：`gm-admin/backend/scripts/init-gm-db.js:49-51`
  ```javascript
  const defaultUsername = process.env.GM_DEFAULT_USERNAME || 'admin';
  const defaultPassword = process.env.GM_DEFAULT_PASSWORD || 'Admin@123';
  const defaultEmail = process.env.GM_DEFAULT_EMAIL || 'admin@example.com';
  ```
- **影响**：当 `.env` 缺失时使用这些回退值初始化数据库
- **轮换步骤**：移除硬编码回退值，强制要求环境变量：
  ```javascript
  const defaultUsername = process.env.GM_DEFAULT_USERNAME;
  const defaultPassword = process.env.GM_DEFAULT_PASSWORD;
  const defaultEmail = process.env.GM_DEFAULT_EMAIL;
  if (!defaultUsername || !defaultPassword || !defaultEmail) {
    throw new Error('GM_DEFAULT_USERNAME/GM_DEFAULT_PASSWORD/GM_DEFAULT_EMAIL 必须在 .env 中设置');
  }
  ```

---

## 🟡 优先级 P2 — 泄露的账户标识符（降低攻击成本）

### 7. GM 后台管理员账户信息
- **泄露值**：用户名 `admin`、邮箱 `admin@example.com`
- **泄露位置**：`gm-admin/backend/.env`、`init-gm-db.js`
- **影响**：攻击者已知管理员用户名，只需爆破密码
- **建议**：
  - 若可能，更改管理员用户名为非默认值（如 `admin` → 随机字符串）
  - 或启用 GM 后台的二次验证（如已实现）

### 8. Prisma seed 创建的账户
- **泄露值**：`admin@dm.local`（admin）、`user@dm.local`（user）、用户名 `admin`/`user`
- **泄露位置**：`apps/api/prisma/seed.ts:9-17`
- **建议**：生产环境不应运行 seed；若已运行，删除或重命名这些测试账户

---

## 🟢 优先级 P3 — 验证项（当前为空，确认未泄露）

### 9. OpenAI API Key
- **当前值**：空（`apps/web/.env` → `VITE_OPENAI_API_KEY=`）
- **状态**：`apps/web/.env` **从未被提交**到 git 历史，无需轮换
- **建议**：确认从未在代码或提交中填入真实 key；保持空值或从服务端代理调用

### 10. Redis 密码
- **当前值**：空（`apps/api/.env` → `REDIS_PASSWORD=`）
- **状态**：空值，无泄露
- **建议**：生产环境应设置 Redis 密码（当前为空，本地开发可接受）

---

## ✅ 轮换后验证清单

完成轮换后，逐项验证：

- [ ] MySQL 新密码可登录：`mysql -u root -p`
- [ ] API 启动正常并连接数据库：`cd apps/api && npm run dev`（无数据库连接错误）
- [ ] Prisma 可连接：`cd apps/api && npx prisma db pull`（无报错）
- [ ] GM 后台启动正常：`cd gm-admin/backend && npm start`
- [ ] 旧 JWT token 已失效：用旧 token 请求 API 应返回 401
- [ ] GM 后台用新密码可登录，旧密码 `Admin@123` 登录失败
- [ ] API 的 `admin@dm.local` 用新密码可登录，旧密码 `admin123` 登录失败
- [ ] `seed.ts` 修改后 `npx prisma db seed` 正常执行（读取环境变量）
- [ ] `git log --all -p | grep "123456"` 无敏感结果（本地历史已清理）
- [ ] GitHub 远端 `git ls-remote origin` 指向 `a39a3acf`（已确认）

---

## 📋 配置文件速查表

轮换后，以下本地 `.env` 文件需更新（均为 gitignored，不提交）：

| 文件 | 需更新的字段 |
|------|-------------|
| `apps/api/.env` | `JWT_SECRET`、`MYSQL_PASSWORD`、`DATABASE_URL` |
| `gm-admin/backend/.env` | `GM_JWT_SECRET`、`MYSQL_PASSWORD`、`GM_DEFAULT_PASSWORD` |

需修改并提交的源码文件：

| 文件 | 修改内容 |
|------|---------|
| `apps/api/prisma/seed.ts` | 硬编码密码 → 环境变量 `SEED_ADMIN_PASSWORD` |
| `gm-admin/backend/scripts/init-gm-db.js` | 移除硬编码回退默认值，强制环境变量 |

---

## 🔒 长期改进建议

1. **密钥管理**：生产环境使用密钥管理服务（如 AWS Secrets Manager、Vault），不依赖 `.env` 文件
2. **pre-commit 钩子**：添加 `git-secrets` 或 `detect-secrets` 防止凭据再次提交
3. **CI 扫描**：在 CI 中集成 GitHub Secret Scanning 或 TruffleHog
4. **`.env` 模板**：所有 `.env` 配置项应在对应的 `.env.example` 中有占位符，新成员按模板创建
5. **最小权限**：MySQL 应用账户不应使用 `root`，创建专用账户并授予最小权限
