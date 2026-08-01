# 前后端同步重构设计规格 — Monorepo + Prisma + Zod + TS 后端

**日期**: 2026-08-01
**项目**: download-manager
**目标版本**: v3.0.0（破坏性变更）
**方案**: 数据契约优先（Approach A）

---

## 0. 背景与动机

### 0.1 现状问题

- **前后端版本不一致**：前端 v2.6.0 vs 后端 v2.5.0
- **后端纯 JavaScript**：无类型保护，controller/route/service 散落，数据模型无单一真相源
- **数据模型不完整**：`database/schema.sql` 仅覆盖 users/downloads/uploads 三表，SPEC 中 files/shares/schedules/schedule_logs/activities 五张表缺失
- **多数据库混乱**：LowDB（默认）/ MySQL（可选）/ SQLite 三套并存，Prisma 无法支持 LowDB
- **前后端类型重复**：前端 `src/types/` 手写类型，与后端无同步机制，易漂移
- **API 文档手写**：`openapi.json` 手动维护，与实现易脱节

### 0.2 已确认的决策基础

| 维度 | 决策 |
|------|------|
| 新技术栈 | Prisma ORM + Zod 验证 + 后端 TypeScript 化 |
| 迁移策略 | 原地一次性重构（在 `backend/` 目录直接改造） |
| 数据库目标 | 仅 MySQL 8.0+（删除 LowDB/SQLite） |
| Schema 共享 | pnpm workspaces monorepo + `packages/shared` |
| 执行方案 | 数据契约优先（Zod schema 为单一真相源） |

---

## 1. 架构

### 1.1 Monorepo 结构

将当前"前端根目录 + backend/ 子目录"改造为 pnpm workspaces monorepo。当前根目录的 `package.json`（前端）迁移到 `apps/web/`，`backend/` 迁移到 `apps/api/`，新增 `packages/shared/` 作为数据契约层。

```
download-manager/                    # monorepo 根
├── pnpm-workspace.yaml              # 工作区配置
├── package.json                     # 根 package.json（脚本编排、devDeps）
├── tsconfig.base.json               # 共享 TS 配置基准
├── apps/
│   ├── web/                         # 前端（原 src/ 全部迁入）
│   │   ├── package.json             # 依赖 @dm/shared
│   │   ├── tsconfig.json            # extends 根 base
│   │   ├── vite.config.ts
│   │   └── src/                     # 现有前端代码
│   └── api/                         # 后端（原 backend/ 全部迁入并 TS 化）
│       ├── package.json             # 依赖 @dm/shared、prisma
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma        # 从 shared Zod 派生
│       │   └── migrations/
│       └── src/                     # TS 重写后的服务
├── packages/
│   └── shared/                      # 数据契约层（单一真相源）
│       ├── package.json             # name: @dm/shared
│       ├── tsconfig.json
│       └── src/
│           ├── schemas/             # Zod schema（实体 + 请求/响应）
│           ├── types.ts             # z.infer 派生的 TS 类型
│           ├── enums.ts             # 共享枚举（状态、角色等）
│           └── index.ts             # 统一导出
└── docs/                            # 集中文档
```

**关键点**：`gm-admin/` 目录按现状保留在根（它是独立的后台前端，不在本次重构范围内，但会消费 `@dm/shared` 以对齐类型）。

### 1.2 技术栈版本矩阵

| 层 | 组件 | 当前版本 | 目标版本 | 说明 |
|----|------|---------|---------|------|
| **前端** | React | 19.2.6 | 19.2.x（不变） | 已满足 |
| | TypeScript | 6.0.3 | 6.0.x（不变） | 已满足 |
| | Vite | 8.1.0 | 8.1.x（不变） | 已满足 |
| | Zod | 4.4.3 | 4.4.x（不变） | 改为从 @dm/shared 重导出 |
| **后端** | Express | 4.18.2 | 5.x | 升级到 Express 5（原生 async 错误处理） |
| | TypeScript | 无 | 6.0.x | 新增 |
| | Prisma | 无 | 6.x | 新增 ORM |
| | Zod | 无 | 4.4.x | 新增，与前端同版本 |
| | mysql2 | 3.9.0 | 删除 | 被 Prisma 取代 |
| **共享** | pnpm | 无 | 10.x | 新增 workspaces 管理 |
| **数据库** | MySQL | 可选 | 8.0+（唯一） | 删除 LowDB/SQLite |
| **测试** | Vitest（前端） | 4.1.9 | 4.1.x（不变） | 后端改用 Vitest（替换 Jest） |

### 1.3 依赖关系图

```
        ┌─────────────────────────────────────┐
        │      packages/shared (@dm/shared)    │   ← 单一真相源
        │  Zod schemas → TS types → enums      │
        └──────────────┬──────────────────────┘
                       │ 依赖（单向）
          ┌────────────┴────────────┐
          ▼                         ▼
   ┌──────────────┐          ┌──────────────┐
   │  apps/web    │          │  apps/api    │
   │  (前端)       │          │  (后端)       │
   │  导入 schema  │          │ 导入 schema   │
   │  做表单验证   │          │ + Prisma 生成 │
   │              │          │ + 路由验证    │
   └──────────────┘          └──────────────┘
```

**核心约束**：`@dm/shared` 不依赖任何其他工作区包；前端和后端**只依赖 shared，不互相依赖**。这保证契约层的纯粹性。

### 1.4 兼容性关键点

- **Express 5**：原生支持 async handler 错误捕获，消除当前 try/catch 样板代码；路由匹配语义有微小变化，需回归测试
- **Prisma 6 + MySQL 8**：Prisma 的 `@db.Text`、`@db.Json` 类型映射 MySQL 8 的 JSON 列，支持当前 schema 中的 ENUM 状态字段
- **Vitest 替换 Jest**：后端测试框架统一为 Vitest，与前端一致，复用 vitest config 经验
- **Node 版本**：Prisma 6 要求 Node 20+，需在根 package.json 声明 `engines.node >=20`

---

## 2. 数据契约层（packages/shared）

这是整个方案的核心——Zod schema 作为单一真相源，前端表单验证、后端路由验证、Prisma schema、OpenAPI 全部从它派生。

### 2.1 Schema 组织模式

每个实体拆分为三层 schema，职责清晰：

| Schema 类型 | 命名 | 用途 | 包含字段 |
|------------|------|------|---------|
| **Entity** | `XxxSchema` | 数据库行结构 | 全字段（含 id、时间戳） |
| **Input** | `XxxCreateSchema` / `XxxUpdateSchema` | 请求体验证 | 用户可输入字段（无 id/时间戳） |
| **Response** | `XxxResponseSchema` | API 响应验证 | 安全输出字段（排除 password 等） |

### 2.2 枚举定义（src/enums.ts）

```typescript
// 状态枚举 —— 前后端、Prisma、DB ENUM 共用
export const DownloadStatus = z.enum([
  'pending', 'downloading', 'paused', 'completed', 'error', 'cancelled'
]);
export type DownloadStatus = z.infer<typeof DownloadStatus>;

export const UploadStatus = z.enum([
  'pending', 'uploading', 'completed', 'error', 'cancelled'
]);

export const UserRole = z.enum(['user', 'admin']);
export const ScheduleType = z.enum(['once', 'daily', 'weekly', 'monthly']);
export const ShareStatus = z.enum(['active', 'disabled', 'expired']);
```

### 2.3 代表性实体 Schema

以 `User` 和 `Download` 为例展示完整模式：

```typescript
// schemas/user.ts
export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string(),              // 仅 DB 层，Response 不暴露
  role: UserRole.default('user'),
  createdAt: z.string().datetime(),  // ISO 8601，API 层统一字符串
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserResponseSchema = UserSchema.omit({ password: true });
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
```

```typescript
// schemas/download.ts
export const DownloadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255),
  status: DownloadStatus,
  progress: z.number().min(0).max(100).multipleOf(0.01),
  downloadedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  resumePosition: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Download = z.infer<typeof DownloadSchema>;

export const DownloadCreateSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),  // 可选，从 URL 推断
});
export type DownloadCreate = z.infer<typeof DownloadCreateSchema>;
```

### 2.4 完整实体清单

基于 SPEC.md 和 DATABASE_SYSTEM.md，shared 包将定义以下实体：

| 实体 | 当前状态 | 备注 |
|------|---------|------|
| User | 已有 | 新增 role 字段支持 GM 后台 |
| Download | 已有 | status 增加 paused |
| Upload | 已有 | 对齐 Download 结构 |
| File | 需新建 | 文件管理（目录树，parentId 自关联） |
| Share | 需新建 | 分享管理（token、密码、过期、次数限制） |
| Schedule | 需新建 | 调度管理（cron、类型、下次执行） |
| ScheduleLog | 需新建 | 调度执行日志 |
| Activity | 需新建 | 统计-最近活动（type、metadata JSON） |

> 当前 `database/schema.sql` 仅覆盖 users/downloads/uploads 三表，files/shares/schedules/schedule_logs/activities 五张表是对现状的补全——这正是"数据库设计与应用需求对齐"要解决的核心问题。

### 2.5 Prisma 派生策略

**Zod 是源，Prisma 手写镜像，测试断言一致性**（不使用反向 codegen，避免源倒置）：

1. `packages/shared/src/schemas/*.ts` 手写 Zod（如上）
2. `apps/api/prisma/schema.prisma` 手写 Prisma model，字段与 Zod 一一对应
3. `apps/api/src/__tests__/contract.test.ts` 契约测试：用 Prisma client 造一条记录，断言能通过对应 Zod schema 校验

```typescript
// 契约测试示例 —— 保证两套 schema 不漂移
it('Prisma Download 行符合 Zod DownloadSchema', async () => {
  const row = await prisma.download.create({ data: testDownloadInput });
  expect(() => DownloadSchema.parse(row)).not.toThrow();
});
```

**类型映射约定**：

| Zod | Prisma | MySQL |
|-----|--------|-------|
| `z.number().int()` | `Int @id @default(autoincrement())` | BIGINT |
| `z.string().datetime()` | `DateTime @default(now())` | DATETIME |
| `z.string().max(N)` | `String(N)` | VARCHAR(N) |
| `z.enum([...])` | `enum XxxStatus {...}` | ENUM |
| `z.number().multipleOf(0.01)` | `Decimal @db.Decimal(5,2)` | DECIMAL |

### 2.6 统一响应信封

所有 API 响应走统一结构，便于前端类型推断和错误处理：

```typescript
// schemas/api.ts
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    timestamp: z.string().datetime(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),                    // 如 'VALIDATION_ERROR'
    message: z.string(),
    details: z.unknown().optional(),      // Zod issues 等
  }),
  timestamp: z.string().datetime(),
});
```

---

## 3. 数据库层（Prisma + MySQL）

### 3.1 Prisma Schema 设计

完整覆盖 8 个实体。展示 `User`、`Download`、`File`（含自关联）三个代表性 model，其余按同模式：

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")   // mysql://user:pass@host:port/db
}

enum UserRole {
  user
  admin
}

enum DownloadStatus {
  pending
  downloading
  paused
  completed
  error
  cancelled
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)    // bcrypt hash
  role      UserRole @default(user)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  downloads  Download[]
  uploads    Upload[]
  files      File[]
  shares     Share[]
  schedules  Schedule[]
  activities Activity[]

  @@map("users")
}

model Download {
  id               Int            @id @default(autoincrement())
  userId           Int            @map("user_id")
  url              String         @db.VarChar(2048)
  filename         String         @db.VarChar(255)
  status           DownloadStatus @default(pending)
  progress         Decimal        @default(0) @db.Decimal(5, 2)
  downloadedBytes  BigInt         @default(0) @map("downloaded_bytes")
  totalBytes       BigInt         @default(0) @map("total_bytes")
  speed            BigInt         @default(0)
  resumePosition   BigInt         @default(0) @map("resume_position")
  createdAt        DateTime       @default(now()) @map("created_at")
  completedAt      DateTime?      @map("completed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])           // 用户按状态筛选
  @@index([userId, createdAt])        // 用户按时间排序
  @@map("downloads")
}

model File {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  name        String   @db.VarChar(255)
  path        String   @db.VarChar(512)
  type        String   @db.VarChar(50)     // mime 或 directory
  size        BigInt   @default(0)
  isDirectory Boolean  @default(false) @map("is_directory")
  parentId    Int?     @map("parent_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent    File?     @relation("FileTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  File[]    @relation("FileTree")
  shares    Share[]

  @@unique([userId, parentId, name])   // 同目录下名称唯一
  @@index([userId, parentId])
  @@map("files")
}
```

**其余 model 一览**（结构遵循同模式）：

| Model | 关键字段 | 关系 | 索引 |
|-------|---------|------|------|
| `Upload` | 镜像 Download | belongsTo User | (userId, createdAt) |
| `Share` | token(unique)、password、expiresAt、downloadLimit、downloadCount、isEnabled | belongsTo User + File | (userId), (token unique) |
| `Schedule` | cron、type、isEnabled、lastRunAt、nextRunAt | belongsTo User | (userId, isEnabled), (nextRunAt) |
| `ScheduleLog` | status、message、startedAt、finishedAt | belongsTo Schedule | (scheduleId, startedAt) |
| `Activity` | type、description、metadata(Json) | belongsTo User | (userId, createdAt) |

### 3.2 关系与删除策略

- **用户删除**：`onDelete: Cascade`——用户删除时其下 downloads/uploads/files/shares/schedules/activities 全部级联删除（符合数据隔离原则）
- **文件树**：自关联 `FileTree`，父目录删除时子项级联删除
- **分享删除**：文件删除时关联分享级联删除（避免悬空分享链接）
- **调度日志**：调度删除时日志级联删除
- **BigInt 处理**：`downloadedBytes` 等用 `BigInt`（Prisma 6 MySQL 原生支持），因大文件可能超过 2^31；API 层序列化为字符串避免 JS 精度丢失（在 shared schema 中用 `z.string()` 或自定义 transform）

### 3.3 迁移策略（现状 → 目标）

当前数据可能存在于两处：LowDB 的 `db.json` 或旧 MySQL 表。迁移分三步：

**Step 1 — 基线迁移**（建立 Prisma 管理的 schema）
```bash
cd apps/api
pnpm prisma migrate dev --name init    # 生成初始 migration + 创建表
```
此步在干净数据库执行；若现有 MySQL 已有旧表，先用 `migrate diff` 生成 baseline 避免冲突。

**Step 2 — 数据迁移脚本**（`apps/api/scripts/migrate-legacy-data.ts`）

迁移前需先将旧 `backend/database/db.json` 备份到 `apps/api/legacy-data/db.json`（脚本从此路径读取，避免依赖已被删除的旧目录结构）：

```typescript
// 从备份的 legacy-data/db.json 读取 → 经 Zod 校验 → 写入 Prisma
import db from '../legacy-data/db.json'
import { UserCreateSchema } from '@dm/shared'

for (const u of db.users) {
  const valid = UserCreateSchema.parse(u)   // 旧数据校验，无效数据跳过并记录
  await prisma.user.create({ data: valid })
}
// downloads/uploads 同理；files/shares/schedules 旧系统无数据，跳过
```

**关键约束**：
- 旧数据中 LowDB 的 `id` 是时间戳（number），MySQL 是自增——迁移时**不保留旧 id**，用自增新 id，通过 `oldId → newId` 映射表维护外键关系
- 无效数据（如缺失字段、格式错误）跳过并写入 `migration-errors.log`，不阻塞迁移

**Step 3 — 回滚预案**
- 迁移前完整备份旧 `db.json` 和旧 MySQL 表（`mysqldump`）
- Prisma migration 可 `migrate resolve --rolled-back` 回退
- 旧 backend 代码保留在 git 历史，必要时 `git revert` 恢复

### 3.4 开发环境数据库

- **统一用 Docker MySQL 8.0**：根目录 `docker-compose.yml` 提供 `db` 服务，端口 3306
- `apps/api/.env`：`DATABASE_URL="mysql://dm:dm123@localhost:3306/download_manager"`
- 开发命令：`pnpm db:up`（启动容器）→ `pnpm db:migrate`（迁移）→ `pnpm db:seed`（种子数据）
- 种子脚本 `apps/api/prisma/seed.ts`：创建测试用户 + 示例下载记录，供前后端联调

### 3.5 与现有文档对齐

- `DATABASE_SYSTEM.md` 将重写：移除 LowDB/SQLite 章节，以 Prisma schema 为准
- `backend/database/` 旧目录（init.js/init-mysql.js/migrate.js 等）在迁移完成后删除，由 `apps/api/prisma/` 取代

---

## 4. 后端改造（TS + Prisma + Zod）

### 4.1 新目录结构（apps/api/src/）

```
apps/api/src/
├── server.ts                      # 入口（原 server.js）
├── app.ts                         # Express app 装配
├── config/
│   ├── env.ts                     # 环境变量（Zod 校验 process.env）
│   ├── prisma.ts                  # PrismaClient 单例
│   ├── redis.ts                   # Redis 客户端（保留）
│   └── socket.ts                  # Socket.io（保留）
├── middleware/
│   ├── auth.ts                    # JWT 认证（TS 重写）
│   ├── validate.ts                # ★ Zod 校验中间件（新增）
│   ├── error.ts                   # 统一错误处理（TS 重写）
│   └── security.ts                # helmet/rate-limit（保留）
├── routes/
│   ├── index.ts                   # 路由聚合
│   ├── auth.routes.ts
│   ├── download.routes.ts
│   ├── upload.routes.ts
│   ├── file.routes.ts
│   ├── share.routes.ts
│   ├── schedule.routes.ts
│   ├── stats.routes.ts
│   ├── gm.routes.ts
│   └── health.routes.ts
├── controllers/                   # HTTP 层：解析请求→调 service→格式化响应
│   ├── auth.controller.ts
│   ├── download.controller.ts
│   └── ...（每路由一控制器）
├── services/                      # 业务逻辑层：Prisma 访问
│   ├── auth.service.ts
│   ├── download.service.ts
│   ├── file.service.ts
│   ├── share.service.ts
│   ├── schedule.service.ts
│   ├── stats.service.ts
│   ├── scheduler.service.ts       # 定时任务执行器（保留）
│   └── cache.service.ts           # Redis 缓存（保留）
├── utils/
│   ├── logger.ts
│   ├── errors.ts                  # AppError 类 + 错误码
│   └── asyncHandler.ts            # async 路由包装
└── __tests__/
    └── contract.test.ts           # Prisma↔Zod 契约测试
```

**迁移映射**：现有 14 个 controller 的去向明确如下：
- 10 个 controller 一一对应 TS 化：`auth`、`download`、`file`、`schedule`、`share`、`stats`、`upload`、`health`、`gmAuth`、`gmDashboard`
- 4 个 controller 合并入对应域 service（不单独保留 controller）：
  - `searchController` → `file.service.ts`（文件搜索）
  - `tagController` → `file.service.ts`（文件标签，附属于文件）
  - `exportController` → `stats.service.ts`（数据导出属统计域）
  - `workflowController` → `schedule.service.ts`（工作流属调度域）

### 4.2 核心模式一：Zod 校验中间件

这是前后端契约同步的执行点——同一份 `@dm/shared` schema 在前端做表单校验、在后端做路由校验：

```typescript
// middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';

type Location = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, location: Location = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      return next(new AppError('VALIDATION_ERROR', 400,
        '请求参数校验失败', result.error.flatten()));
    }
    req[location] = result.data;   // 替换为校验后的数据（含默认值/转换）
    next();
  };
```

### 4.3 核心模式二：路由定义（薄层）

```typescript
// routes/download.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import { DownloadCreateSchema } from '@dm/shared';
import * as ctrl from '../controllers/download.controller';

const router = Router();

router.get('/', auth, ctrl.list);
router.post('/', auth, validate(DownloadCreateSchema, 'body'), ctrl.create);
router.post('/:id/start', auth, ctrl.start);
router.post('/:id/pause', auth, ctrl.pause);
router.post('/:id/resume', auth, ctrl.resume);
router.post('/:id/cancel', auth, ctrl.cancel);
router.delete('/:id', auth, ctrl.remove);

export default router;
```

### 4.4 核心模式三：Service 层（Prisma 访问）

```typescript
// services/download.service.ts
import { prisma } from '../config/prisma';
import type { DownloadCreate, Download } from '@dm/shared';

export async function createDownload(userId: number, input: DownloadCreate): Promise<Download> {
  const row = await prisma.download.create({
    data: {
      userId,
      url: input.url,
      filename: input.filename ?? deriveFilename(input.url),
    },
  });
  return serializeDownload(row);   // BigInt → string，对齐 shared schema
}
```

**序列化层**：Prisma 返回的 `BigInt`/`Decimal`/`DateTime` 需转为 shared schema 期望的 `string`。统一在 service 边界用 `serializeXxx` 函数转换，保证 controller 拿到的就是 Zod 兼容结构。

### 4.5 核心模式四：Async 错误处理

Express 5 原生支持 async handler 自动转发 reject 到错误中间件，但为统一日志和错误转换，保留薄包装：

```typescript
// utils/asyncHandler.ts
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// utils/errors.ts
export class AppError extends Error {
  constructor(public code: string, public status: number,
              message: string, public details?: unknown) { super(message); }
}
```

```typescript
// middleware/error.ts —— 统一转换为 ApiErrorSchema 信封
import { ApiErrorSchema } from '@dm/shared';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json(ApiErrorSchema.parse({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      timestamp: new Date().toISOString(),
    }));
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 唯一约束、P2025 记录不存在等 → 映射为 AppError
  }
  logger.error(err);
  res.status(500).json(/* 通用 500 信封 */);
}
```

### 4.6 OpenAPI 自动生成

用 `@asteasolutions/zod-to-openapi` 从 shared Zod schema 生成 OpenAPI 规范，替代当前手写的 `openapi.json`：

```typescript
// scripts/gen-openapi.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { DownloadSchema, DownloadCreateSchema } from '@dm/shared';

const registry = new OpenAPIRegistry();
registry.register('Download', DownloadSchema);
registry.registerPath({ method: 'post', path: '/api/downloads',
  request: { body: { content: { 'application/json': { schema: DownloadCreateSchema } } } },
  responses: { 201: { content: { 'application/json': { schema: DownloadSchema } } } } });
// ... 输出 openapi.json
```

**契约同步闭环**：shared Zod → 后端路由校验 + OpenAPI 生成 → 前端 `openapi-typescript` 生成类型 + 直接 import shared schema 做表单验证。任何 schema 变更，三处自动同步。

### 4.7 保留与删除

| 现有模块 | 处理 |
|---------|------|
| `config/mysql.js`、`config/database.js`（LowDB） | **删除**，由 `config/prisma.ts` 取代 |
| `database/` 目录（init.js/migrate.js/schema.sql） | **删除**，由 `prisma/` 取代 |
| `services/CacheService.js`、`config/redis.js` | **保留** TS 化（Redis 降级模式仍保留） |
| `services/scheduler.js`/`SchedulerService.js` | **保留** TS 化，改用 Prisma 读写 schedule 表 |
| `middleware/auth.js`、`errorHandler.js` | **TS 重写** |
| `multer`（上传） | **保留**，TS 化类型声明 |

---

## 5. 前端接入 + 数据流

### 5.1 前端消费 shared 包

当前前端 `src/types/` 手写类型，`src/services/` 手写 API 调用。改造后类型从 `@dm/shared` 导入，消除手写重复：

```typescript
// apps/web/src/services/api.ts —— 统一 axios 客户端
import axios from 'axios';
import { ApiSuccessSchema, ApiErrorSchema } from '@dm/shared';

export const api = axios.create({ baseURL: '/api', timeout: 30000 });

// 响应拦截：用 shared 信封 schema 校验后端返回
api.interceptors.response.use(
  (res) => {
    const parsed = ApiSuccessSchema(z.unknown()).safeParse(res.data);
    if (!parsed.success) return Promise.reject(new Error('响应格式不符契约'));
    return parsed.data.data;   // 直接解包 data，调用方拿到纯业务数据
  },
  (err) => {
    const parsed = ApiErrorSchema.safeParse(err.response?.data);
    return Promise.reject(parsed.success ? parsed.data.error : err);
  }
);
```

### 5.2 类型替换策略

| 现有 | 改造后 |
|------|--------|
| `src/types/download.ts` 手写 `Download` interface | `import type { Download } from '@dm/shared'` |
| `src/types/user.ts` | `import type { UserResponse } from '@dm/shared'` |
| `src/services/downloadService.ts` 返回 `any` | 返回 `Promise<Download>`（shared 类型） |

**删除 `src/types/` 下所有手写类型文件**，全部从 shared 重导出。这一步是"统一数据模型规范"在前端的落地——前端不再有独立的类型定义。

### 5.3 表单验证复用 shared schema

当前前端已有 `react-hook-form` + `@hookform/resolvers`。直接用 shared 的 `XxxCreateSchema` 做表单 resolver：

```typescript
// apps/web/src/pages/Downloads/components/CreateForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DownloadCreateSchema, type DownloadCreate } from '@dm/shared';

export function CreateForm() {
  const form = useForm<DownloadCreate>({ resolver: zodResolver(DownloadCreateSchema) });
  // 表单字段、校验规则全部由 shared schema 驱动
  // ...
}
```

**契约一致性**：用户在前端表单填错 → shared schema 即时报错；即使绕过前端直发后端 → 后端 `validate` 中间件用同一份 schema 再校验一次。无任何漂移可能。

### 5.4 端到端数据流

```
┌─────────────────── 前端 ───────────────────┐     ┌──────────── 后端 ────────────┐
│  React 表单                                 │     │                              │
│   │ zodResolver(DownloadCreateSchema)       │     │                              │
│   ▼ 前端校验通过                            │     │                              │
│  API client (axios)                         │     │                              │
│   │ POST /api/downloads                     │─────▶│  validate(DownloadCreateSchema)│
│   │                                         │     │   ▼ 后端校验通过              │
│   │                                         │     │  download.controller.create  │
│   │                                         │     │   ▼                          │
│   │                                         │     │  download.service.createDownload│
│   │                                         │     │   ▼ prisma.download.create   │
│   │                                         │     │  ┌────────────────┐          │
│   │                                         │     │  │   MySQL (Prisma) │          │
│   │                                         │     │  └───────┬────────┘          │
│   │                                         │     │          │ row               │
│   │                                         │     │  serializeDownload (BigInt→str)│
│   │                                         │     │   ▼                          │
│   │                                         │     │  ApiSuccessSchema.parse → JSON│
│   ▼ ApiSuccessSchema 校验响应               │◀─────│  res.json({ success, data })  │
│  zustand store                              │     │                              │
│   ▼                                         │     │                              │
│  React 组件渲染                             │     │                              │
└─────────────────────────────────────────────┘     └──────────────────────────────┘
              ↑                                                      │
              └────────── Socket.io 实时推送（下载进度） ◀──────────────┘
```

### 5.5 实时数据流（Socket.io）

下载进度、上传进度通过 Socket.io 推送，事件 payload 同样用 shared schema 校验：

```typescript
// 后端：发射前校验
import { DownloadSchema } from '@dm/shared';
io.to(`user:${userId}`).emit('download:progress',
  DownloadSchema.parse(serializeDownload(row)));

// 前端：接收时校验
socket.on('download:progress', (data) => {
  const result = DownloadSchema.safeParse(data);
  if (result.success) store.updateDownload(result.data);
});
```

这保证 WebSocket 通道也受契约约束，不会因后端漏字段导致前端运行时崩溃。

### 5.6 错误流

```
后端 validate 中间件失败 → AppError('VALIDATION_ERROR', 400, details=zodIssues)
  → error 中间件 → ApiErrorSchema.parse → { success:false, error:{code,message,details} }
  → 前端 axios 拦截器 → reject(error)
  → React 表单 setError() / Toast 提示
```

前端能直接消费 `error.details`（Zod flatten 结果）映射到对应表单字段，实现"后端校验错误精准回显到前端表单字段"。

### 5.7 前端改造范围

- `src/types/` 全部删除，改从 `@dm/shared` 导入
- `src/services/*.ts` 增加响应类型注解 + axios 拦截器
- 表单组件接入 `zodResolver(sharedSchema)`
- Socket 事件处理增加 `safeParse` 校验
- `src/store/` zustand store 的 state 类型改用 shared 类型

**不改动**：UI 组件、页面布局、路由结构、Tailwind 样式——本次只动数据契约层和 API 层，不碰视觉。

---

## 6. 错误处理 + 测试策略 + 交付与进度跟踪

### 6.1 统一错误码目录

集中定义错误码，前后端共享，便于前端精准分支处理：

```typescript
// packages/shared/src/errors.ts
export const ErrorCode = {
  VALIDATION_ERROR:    { status: 400, code: 'VALIDATION_ERROR' },
  UNAUTHORIZED:        { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN:           { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND:           { status: 404, code: 'NOT_FOUND' },
  CONFLICT:            { status: 409, code: 'CONFLICT' },         // 唯一约束冲突
  RATE_LIMITED:        { status: 429, code: 'RATE_LIMITED' },
  DOWNLOAD_FAILED:     { status: 500, code: 'DOWNLOAD_FAILED' },
  INTERNAL_ERROR:      { status: 500, code: 'INTERNAL_ERROR' },
} as const;
```

**Prisma 错误自动映射**（在 `error.ts` 中间件）：

| Prisma Code | 含义 | 映射 |
|-------------|------|------|
| P2002 | 唯一约束冲突 | `CONFLICT` |
| P2025 | 记录不存在 | `NOT_FOUND` |
| P2003 | 外键约束失败 | `VALIDATION_ERROR` |
| 其他 | - | `INTERNAL_ERROR` + 日志 |

### 6.2 测试策略（四层金字塔）

| 层级 | 工具 | 范围 | 运行时机 |
|------|------|------|---------|
| **契约测试** | Vitest | Prisma 行 ↔ shared Zod schema 一致性 | pre-commit |
| **单元测试** | Vitest | service 层（mock Prisma）、utils | pre-commit |
| **集成测试** | Vitest + supertest | 路由→controller→service→Prisma（真实测试 DB） | pre-merge |
| **前端组件测试** | Vitest + RTL | 表单 zodResolver、API client 拦截器 | pre-commit |

**测试 DB 策略**：集成测试用独立 `download_manager_test` 数据库，每测试套件 `beforeEach` 清表，`afterAll` 断开。不共用开发库。

```typescript
// 集成测试示例
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

describe('POST /api/downloads', () => {
  beforeEach(async () => { await prisma.download.deleteMany(); });

  it('合法输入返回 201 + DownloadSchema 兼容数据', async () => {
    const res = await request(app).post('/api/downloads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/file.zip' });
    expect(res.status).toBe(201);
    expect(() => DownloadSchema.parse(res.body.data)).not.toThrow();
  });

  it('非法 URL 返回 400 + VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/downloads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 6.3 执行阶段与里程碑（方案 A 落地）

| 阶段 | 内容 | DoD（完成定义） | 验证点 |
|------|------|----------------|--------|
| **P1** Monorepo 搭建 | pnpm workspaces + 三包骨架 + 迁移现有代码 | `pnpm install` 通过，前端 `pnpm dev`、后端 `pnpm dev` 均可启动（后端仍 JS） | 结构就绪，功能不变 |
| **P2** shared 契约层 | 8 实体 Zod schema + 枚举 + API 信封 | `pnpm --filter @dm/shared build` 通过，类型可被前后端导入 | 契约层独立可测 |
| **P3** Prisma + MySQL | schema.prisma + Docker MySQL + 迁移脚本 + 契约测试 | `pnpm db:migrate` 建表，契约测试通过，旧 db.json 数据迁入 | DB 层与契约对齐 |
| **P4** 后端 TS 改造 | 14 controller TS 化 + validate 中间件 + service 层 + OpenAPI gen | 所有路由集成测试通过，OpenAPI 生成成功 | 后端实现契约 |
| **P5** 前端接入 | 删 types/、接 shared、axios 拦截器、表单 resolver | 现有 Vitest 全绿，类型零手写 | 前端消费契约 |
| **P6** 交付验证 | E2E 联调、文档更新、版本发布 v3.0.0 | 前后端联调全流程通过，CHANGELOG/SPEC/DB 文档更新 | 交付完成 |

### 6.4 进度跟踪与同步机制

- **每阶段一个 git 分支**：`refactor/p1-monorepo` → `refactor/p2-shared` → ... → 合并到 `main`
- **阶段评审门**：每阶段 DoD 满足后才进入下一阶段；阶段末出一份小结（改了什么、验证结果、下阶段计划）
- **契约变更协议**：`@dm/shared` 的任何 schema 变更必须同步更新 Prisma schema + OpenAPI + 相关测试，三者不一致则 CI 红灯
- **CI 流水线**：`pnpm lint && pnpm test && pnpm build`，契约测试 + 集成测试必须全绿才允许合并

### 6.5 版本与文档交付

- **版本号**：v3.0.0（主版本号 bump，因破坏性变更：删除 LowDB/SQLite、后端 TS 重写）
- **更新文档**：
  - `SPEC.md`：技术栈改为 monorepo + Prisma + TS 后端
  - `DATABASE_SYSTEM.md`：重写为 Prisma + MySQL 8 唯一方案
  - `CHANGELOG.md`：v3.0.0 破坏性变更说明 + 迁移指南
  - 新增 `docs/api-contract.md`：契约层使用说明
- **迁移指南**：`docs/migration-v2-to-v3.md`，供现有用户从 LowDB/旧 MySQL 升级

### 6.6 风险与回滚

| 风险 | 缓解 |
|------|------|
| 原地重构期间服务不可用 | 集中在 P4，期间用 git 分支隔离；旧 backend 在 main 分支可随时回退 |
| LowDB 数据迁移丢失 | 迁移前备份 db.json + mysqldump；错误数据记日志不阻塞 |
| BigInt 序列化遗漏 | service 边界统一 serialize 函数 + 契约测试覆盖 |
| Express 5 路由语义变化 | P4 集成测试全量回归现有 11 个路由文件 |

---

## 7. 验收标准（整体）

1. `pnpm install` 在 monorepo 根执行成功，三包依赖关系正确
2. `pnpm --filter @dm/shared build` 产出可被前后端导入的类型与 schema
3. `pnpm db:up && pnpm db:migrate && pnpm db:seed` 一键拉起开发数据库
4. 后端 `pnpm test`：契约测试 + 单元测试 + 集成测试全绿
5. 前端 `pnpm test`：现有 Vitest 套件全绿，`src/types/` 已删除
6. 前后端联调：登录→创建下载→实时进度→文件管理→分享→调度全流程通过
7. `pnpm gen:openapi` 生成的 `openapi.json` 与 shared schema 一致
8. `SPEC.md`/`DATABASE_SYSTEM.md`/`CHANGELOG.md` 已更新至 v3.0.0
9. `docs/migration-v2-to-v3.md` 迁移指南可用

---

**最后更新**: 2026-08-01
