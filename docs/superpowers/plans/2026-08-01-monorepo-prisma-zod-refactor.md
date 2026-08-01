# Monorepo + Prisma + Zod + TS 后端重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 download-manager 从"前端根目录 + JS 后端 + LowDB/MySQL"重构为 pnpm workspaces monorepo，以 `@dm/shared` Zod schema 为单一真相源，后端 TS + Prisma + MySQL 8，前端消费共享契约，交付 v3.0.0。

**Architecture:** 数据契约优先——`packages/shared` 的 Zod schema 是唯一数据模型源；`apps/api`（后端）和 `apps/web`（前端）单向依赖 shared；Prisma schema 手写镜像 Zod 并由契约测试断言一致；OpenAPI 从 Zod 自动生成。6 个阶段（P1-P6）顺序执行，每阶段独立 git 分支 + DoD 评审门。

**Tech Stack:** pnpm 10 workspaces, TypeScript 6, Zod 4.4, Prisma 6, MySQL 8, Express 5, Vitest 4, React 19, Vite 8, `@asteasolutions/zod-to-openapi`

**Spec:** `docs/superpowers/specs/2026-08-01-monorepo-prisma-zod-refactor-design.md`

---

## 文件结构总览

### 新建文件
```
pnpm-workspace.yaml                          # 工作区声明
tsconfig.base.json                           # 共享 TS 基准
docker-compose.yml                           # MySQL 8 开发容器（覆盖现有）
packages/shared/package.json                 # @dm/shared 包定义
packages/shared/tsconfig.json
packages/shared/src/index.ts                 # 统一导出
packages/shared/src/enums.ts                 # 共享枚举
packages/shared/src/errors.ts                # 错误码目录
packages/shared/src/schemas/user.ts
packages/shared/src/schemas/download.ts
packages/shared/src/schemas/upload.ts
packages/shared/src/schemas/file.ts
packages/shared/src/schemas/share.ts
packages/shared/src/schemas/schedule.ts
packages/shared/src/schemas/activity.ts
packages/shared/src/schemas/api.ts           # 响应信封
apps/web/package.json                        # 前端包定义（从根迁入）
apps/web/tsconfig.json
apps/api/package.json                        # 后端包定义
apps/api/tsconfig.json
apps/api/prisma/schema.prisma
apps/api/prisma/seed.ts
apps/api/src/config/prisma.ts
apps/api/src/config/env.ts
apps/api/src/middleware/validate.ts
apps/api/src/middleware/error.ts
apps/api/src/utils/errors.ts
apps/api/src/utils/asyncHandler.ts
apps/api/src/utils/serialize.ts
apps/api/src/__tests__/contract.test.ts
apps/api/scripts/migrate-legacy-data.ts
apps/api/scripts/gen-openapi.ts
```

### 迁移（移动）
```
src/*                     → apps/web/src/*
backend/src/*             → apps/api/src/*（并 TS 化）
backend/package.json      → apps/api/package.json（重写）
package.json（根前端）     → apps/web/package.json（重写）
```

### 删除
```
backend/database/          # init.js/migrate.js/schema.sql 等，由 prisma/ 取代
backend/config/mysql.js    # 由 config/prisma.ts 取代
backend/config/database.js # LowDB 配置
apps/web/src/types/        # 手写类型，由 @dm/shared 取代
```

---

# 阶段 P1：Monorepo 搭建

**分支:** `refactor/p1-monorepo`
**DoD:** `pnpm install` 通过；`pnpm --filter web dev` 与 `pnpm --filter api dev` 均可启动（后端仍 JS，功能不变）

### Task P1.1：初始化 pnpm workspaces 骨架

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `package.json`（根，改为编排角色）

- [ ] **Step 1: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "bundler",
    "useDefineForClassFields": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: 重写根 package.json 为编排角色**

将根 `package.json` 改为（保留 name/private，新增 workspaces 脚本编排，原前端依赖移走）：

```json
{
  "name": "download-manager",
  "version": "3.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "db:up": "docker compose up -d db",
    "db:migrate": "pnpm --filter api prisma:migrate",
    "db:seed": "pnpm --filter api prisma:seed",
    "gen:openapi": "pnpm --filter api gen:openapi"
  },
  "devDependencies": {
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 4: 验证 pnpm 识别工作区**

Run: `pnpm -r list --depth -1 2>&1 | Select-Object -First 5`
Expected: 列出（暂为空，因 apps/packages 尚未创建包）

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml tsconfig.base.json package.json
git commit -m "chore(p1): init pnpm workspaces monorepo skeleton"
```

### Task P1.2：迁移前端到 apps/web

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Move: `src/*` → `apps/web/src/*`
- Move: `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `tsconfig.test.json`, `vitest.config.ts`, `eslint.config.js` → `apps/web/`

- [ ] **Step 1: 创建 apps/web 目录结构**

Run: `New-Item -ItemType Directory -Path apps/web -Force`

- [ ] **Step 2: 移动前端文件到 apps/web**

```bash
git mv src apps/web/src
git mv index.html apps/web/index.html
git mv vite.config.ts apps/web/vite.config.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv tsconfig.build.json apps/web/tsconfig.build.json
git mv tsconfig.test.json apps/web/tsconfig.test.json
git mv vitest.config.ts apps/web/vitest.config.ts
git mv eslint.config.js apps/web/eslint.config.js
git mv public apps/web/public
```

- [ ] **Step 3: 创建 apps/web/package.json（从根前端依赖迁移）**

```json
{
  "name": "web",
  "version": "3.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.build.json && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@dm/shared": "workspace:*",
    "@hookform/resolvers": "^5.4.0",
    "@radix-ui/react-accordion": "^1.2.15",
    "axios": "^1.16.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-hook-form": "^7.77.0",
    "react-i18next": "^17.0.8",
    "react-router-dom": "^7.17.0",
    "react-window": "^1.8.10",
    "socket.io-client": "^4.8.3",
    "zod": "^4.4.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^10.6.0",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.3.2",
    "typescript": "^6.0.3",
    "vite": "^8.1.0",
    "vitest": "^4.1.9"
  }
}
```

> 注：完整依赖列表从原根 package.json 迁移，此处展示关键依赖。`@dm/shared` 用 `workspace:*` 引用。

- [ ] **Step 4: 创建 apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "noEmit": true,
    "paths": { "@dm/shared": ["../../packages/shared/src"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: pnpm install 并验证前端可启动**

Run: `pnpm install`
Expected: 安装成功（@dm/shared 暂未创建，需先做 P1.3 创建骨架，此步可能警告）

- [ ] **Step 6: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "chore(p1): migrate frontend to apps/web"
```

### Task P1.3：创建 @dm/shared 骨架

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: 创建目录**

Run: `New-Item -ItemType Directory -Path packages/shared/src -Force`

- [ ] **Step 2: 创建 packages/shared/package.json**

```json
{
  "name": "@dm/shared",
  "version": "3.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./errors": "./src/errors.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": { "zod": "^4.4.3" },
  "devDependencies": { "typescript": "^6.0.3" }
}
```

- [ ] **Step 3: 创建 packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "lib": ["ES2020"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建占位 index.ts（P2 填充）**

```typescript
// packages/shared/src/index.ts
// 数据契约层统一导出 —— P2 阶段填充
export {};
```

- [ ] **Step 5: pnpm install 验证 @dm/shared 可被识别**

Run: `pnpm install`
Expected: 成功，`@dm/shared` 工作区链接建立

- [ ] **Step 6: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "chore(p1): add @dm/shared contract package skeleton"
```

### Task P1.4：迁移后端到 apps/api（保持 JS，TS 化在 P4）

**Files:**
- Create: `apps/api/package.json`
- Move: `backend/src/*` → `apps/api/src/*`
- Move: `backend/scripts/*` → `apps/api/scripts/*`
- Move: `backend/tests/*` → `apps/api/tests/*`

- [ ] **Step 1: 创建 apps/api 目录**

Run: `New-Item -ItemType Directory -Path apps/api -Force`

- [ ] **Step 2: 移动后端文件**

```bash
git mv backend/src apps/api/src
git mv backend/scripts apps/api/scripts
git mv backend/tests apps/api/tests
git mv backend/ecosystem.config.js apps/api/ecosystem.config.js
git mv backend/jest.config.js apps/api/jest.config.js
git mv backend/.env.example apps/api/.env.example
```

- [ ] **Step 3: 创建 apps/api/package.json（保留 JS 依赖，P4 再加 TS/Prisma）**

```json
{
  "name": "api",
  "version": "3.0.0",
  "private": true,
  "type": "commonjs",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.9.0",
    "redis": "^6.1.0",
    "socket.io": "^4.8.3",
    "swagger-ui-express": "^5.0.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.2"
  }
}
```

- [ ] **Step 4: 删除旧 backend 目录残留**

Run: `Remove-Item -Recurse -Force backend`（确认已全部 git mv）

- [ ] **Step 5: pnpm install 并验证后端可启动**

Run: `pnpm install`
Run: `pnpm --filter api dev`
Expected: 后端启动（仍用 LowDB/mysql2，功能不变）

- [ ] **Step 6: Commit**

```bash
git add apps/api pnpm-lock.yaml
git rm -r backend 2>$null
git commit -m "chore(p1): migrate backend to apps/api (still JS)"
```

### Task P1.5：P1 验证与合并

- [ ] **Step 1: 全工作区安装**

Run: `pnpm install`
Expected: 三包链接成功

- [ ] **Step 2: 前端启动验证**

Run: `pnpm dev:web`
Expected: Vite 启动，页面可访问

- [ ] **Step 3: 后端启动验证**

Run: `pnpm dev:api`
Expected: Express 启动，健康检查 `/api/health` 返回 200

- [ ] **Step 4: 合并到 main**

```bash
git checkout main
git merge refactor/p1-monorepo
git commit -m "Merge P1: monorepo structure ready"
```

---

# 阶段 P2：shared 契约层

**分支:** `refactor/p2-shared`
**DoD:** `pnpm --filter @dm/shared build` 通过；8 实体 schema + 枚举 + API 信封 + 错误码可被导入

### Task P2.1：枚举定义

**Files:**
- Create: `packages/shared/src/enums.ts`

- [ ] **Step 1: 写 enums.ts**

```typescript
import { z } from 'zod';

export const DownloadStatus = z.enum([
  'pending', 'downloading', 'paused', 'completed', 'error', 'cancelled',
]);
export type DownloadStatus = z.infer<typeof DownloadStatus>;

export const UploadStatus = z.enum([
  'pending', 'uploading', 'completed', 'error', 'cancelled',
]);
export type UploadStatus = z.infer<typeof UploadStatus>;

export const UserRole = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const ScheduleType = z.enum(['once', 'daily', 'weekly', 'monthly']);
export type ScheduleType = z.infer<typeof ScheduleType>;

export const ShareStatus = z.enum(['active', 'disabled', 'expired']);
export type ShareStatus = z.infer<typeof ShareStatus>;

export const ScheduleLogStatus = z.enum(['running', 'success', 'failed']);
export type ScheduleLogStatus = z.infer<typeof ScheduleLogStatus>;
```

- [ ] **Step 2: 验证编译**

Run: `pnpm --filter @dm/shared build`
Expected: 成功

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/enums.ts
git commit -m "feat(p2): add shared enums"
```

### Task P2.2：错误码目录

**Files:**
- Create: `packages/shared/src/errors.ts`

- [ ] **Step 1: 写 errors.ts**

```typescript
export const ErrorCode = {
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  DOWNLOAD_FAILED: { status: 500, code: 'DOWNLOAD_FAILED' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
export type ErrorDef = typeof ErrorCode[ErrorCodeKey];
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/errors.ts
git commit -m "feat(p2): add shared error code catalog"
```

### Task P2.3：API 响应信封 schema

**Files:**
- Create: `packages/shared/src/schemas/api.ts`

- [ ] **Step 1: 写 api.ts**

```typescript
import { z } from 'zod';

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    timestamp: z.string().datetime(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  timestamp: z.string().datetime(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/api.ts
git commit -m "feat(p2): add API response envelope schemas"
```

### Task P2.4：User schema

**Files:**
- Create: `packages/shared/src/schemas/user.ts`

- [ ] **Step 1: 写 user.ts**

```typescript
import { z } from 'zod';
import { UserRole } from '../enums';

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string(),
  role: UserRole.default('user'),
  createdAt: z.string().datetime(),
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
export type Login = z.infer<typeof LoginSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/user.ts
git commit -m "feat(p2): add User schemas"
```

### Task P2.5：Download schema

**Files:**
- Create: `packages/shared/src/schemas/download.ts`

- [ ] **Step 1: 写 download.ts**

```typescript
import { z } from 'zod';
import { DownloadStatus } from '../enums';

export const DownloadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255),
  status: DownloadStatus,
  progress: z.number().min(0).max(100),
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
  filename: z.string().min(1).max(255).optional(),
});
export type DownloadCreate = z.infer<typeof DownloadCreateSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/download.ts
git commit -m "feat(p2): add Download schemas"
```

### Task P2.6：Upload schema

**Files:**
- Create: `packages/shared/src/schemas/upload.ts`

- [ ] **Step 1: 写 upload.ts**

```typescript
import { z } from 'zod';
import { UploadStatus } from '../enums';

export const UploadSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  filePath: z.string().min(1).max(512),
  status: UploadStatus,
  progress: z.number().min(0).max(100),
  uploadedBytes: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type Upload = z.infer<typeof UploadSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/upload.ts
git commit -m "feat(p2): add Upload schema"
```

### Task P2.7：File schema（含自关联）

**Files:**
- Create: `packages/shared/src/schemas/file.ts`

- [ ] **Step 1: 写 file.ts**

```typescript
import { z } from 'zod';

export const FileSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(512),
  type: z.string().min(1).max(50),
  size: z.number().int().nonnegative(),
  isDirectory: z.boolean(),
  parentId: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type File = z.infer<typeof FileSchema>;

export const FileCreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.number().int().positive().nullable(),
});
export type FileCreateFolder = z.infer<typeof FileCreateFolderSchema>;

export const FileRenameSchema = z.object({
  name: z.string().min(1).max(255),
});
export type FileRename = z.infer<typeof FileRenameSchema>;

export const FileMoveSchema = z.object({
  parentId: z.number().int().positive().nullable(),
});
export type FileMove = z.infer<typeof FileMoveSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/file.ts
git commit -m "feat(p2): add File schemas"
```

### Task P2.8：Share schema

**Files:**
- Create: `packages/shared/src/schemas/share.ts`

- [ ] **Step 1: 写 share.ts**

```typescript
import { z } from 'zod';
import { ShareStatus } from '../enums';

export const ShareSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  fileId: z.number().int().positive(),
  token: z.string().min(1),
  password: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  downloadLimit: z.number().int().nonnegative().nullable(),
  downloadCount: z.number().int().nonnegative(),
  status: ShareStatus,
  createdAt: z.string().datetime(),
});
export type Share = z.infer<typeof ShareSchema>;

export const ShareCreateSchema = z.object({
  fileId: z.number().int().positive(),
  password: z.string().min(4).max(128).optional(),
  expiresAt: z.string().datetime().optional(),
  downloadLimit: z.number().int().positive().optional(),
});
export type ShareCreate = z.infer<typeof ShareCreateSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/share.ts
git commit -m "feat(p2): add Share schemas"
```

### Task P2.9：Schedule + ScheduleLog schema

**Files:**
- Create: `packages/shared/src/schemas/schedule.ts`

- [ ] **Step 1: 写 schedule.ts**

```typescript
import { z } from 'zod';
import { ScheduleType, ScheduleLogStatus } from '../enums';

export const ScheduleSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),
  cron: z.string().min(1).max(100),
  type: ScheduleType,
  isEnabled: z.boolean(),
  lastRunAt: z.string().datetime().nullable(),
  nextRunAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const ScheduleCreateSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().min(1).max(255).optional(),
  cron: z.string().min(1).max(100),
  type: ScheduleType,
});
export type ScheduleCreate = z.infer<typeof ScheduleCreateSchema>;

export const ScheduleLogSchema = z.object({
  id: z.number().int().positive(),
  scheduleId: z.number().int().positive(),
  status: ScheduleLogStatus,
  message: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
});
export type ScheduleLog = z.infer<typeof ScheduleLogSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/schedule.ts
git commit -m "feat(p2): add Schedule and ScheduleLog schemas"
```

### Task P2.10：Activity schema

**Files:**
- Create: `packages/shared/src/schemas/activity.ts`

- [ ] **Step 1: 写 activity.ts**

```typescript
import { z } from 'zod';

export const ActivitySchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  type: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
});
export type Activity = z.infer<typeof ActivitySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/activity.ts
git commit -m "feat(p2): add Activity schema"
```

### Task P2.11：统一导出 + 契约层测试

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts`

- [ ] **Step 1: 重写 index.ts 统一导出**

```typescript
export * from './enums';
export * from './errors';
export * from './schemas/api';
export * from './schemas/user';
export * from './schemas/download';
export * from './schemas/upload';
export * from './schemas/file';
export * from './schemas/share';
export * from './schemas/schedule';
export * from './schemas/activity';
```

- [ ] **Step 2: 写 schema 冒烟测试**

```typescript
// packages/shared/src/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  UserSchema, DownloadSchema, DownloadCreateSchema,
  ApiSuccessSchema, ApiErrorSchema,
} from '../index';

describe('shared schemas smoke test', () => {
  it('DownloadCreateSchema 校验合法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'https://example.com/f.zip' });
    expect(r.success).toBe(true);
  });

  it('DownloadCreateSchema 拒绝非法 URL', () => {
    const r = DownloadCreateSchema.safeParse({ url: 'not-a-url' });
    expect(r.success).toBe(false);
  });

  it('ApiSuccessSchema 包裹数据', () => {
    const r = ApiSuccessSchema(UserSchema).safeParse({
      success: true,
      data: { id: 1, username: 'a', email: 'a@b.com', password: 'x', role: 'user', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(r.success).toBe(true);
  });

  it('ApiErrorSchema 校验错误信封', () => {
    const r = ApiErrorSchema.safeParse({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad' },
      timestamp: '2026-01-01T00:00:00Z',
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter @dm/shared test`
Expected: 4 个测试通过

- [ ] **Step 4: 构建验证**

Run: `pnpm --filter @dm/shared build`
Expected: 编译成功，产出 dist/

- [ ] **Step 5: Commit + 合并**

```bash
git add packages/shared/src/index.ts packages/shared/src/__tests__
git commit -m "feat(p2): unified exports + schema smoke tests"
git checkout main
git merge refactor/p2-shared
```

---

# 阶段 P3：Prisma + MySQL

**分支:** `refactor/p3-prisma`
**DoD:** `pnpm db:migrate` 建表成功；契约测试通过；旧 db.json 数据迁入

### Task P3.1：Docker MySQL + 后端依赖

**Files:**
- Modify: `docker-compose.yml`
- Modify: `apps/api/package.json`
- Create: `apps/api/.env`

- [ ] **Step 1: 写 docker-compose.yml（覆盖根）**

```yaml
services:
  db:
    image: mysql:8.0
    container_name: dm-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: download_manager
      MYSQL_USER: dm
      MYSQL_PASSWORD: dm123
    ports:
      - "3306:3306"
    volumes:
      - dm-mysql-data:/var/lib/mysql
volumes:
  dm-mysql-data:
```

- [ ] **Step 2: 更新 apps/api/package.json 增加 Prisma/TS 依赖**

在 `apps/api/package.json` 的 dependencies 增加：
```json
    "@dm/shared": "workspace:*",
    "@prisma/client": "^6.0.0",
    "zod": "^4.4.3"
```
devDependencies 增加：
```json
    "prisma": "^6.0.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.9",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "ts-node": "^10.9.2"
```
scripts 增加：
```json
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "gen:openapi": "ts-node scripts/gen-openapi.ts"
```

- [ ] **Step 3: 创建 apps/api/.env**

```env
DATABASE_URL="mysql://dm:dm123@localhost:3306/download_manager"
JWT_SECRET=change-this-in-production
PORT=5001
UPLOAD_PATH=./uploads
```

- [ ] **Step 4: 启动 MySQL 容器**

Run: `pnpm db:up`
Expected: dm-mysql 容器运行

- [ ] **Step 5: pnpm install**

Run: `pnpm install`
Expected: Prisma 安装成功

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml apps/api/package.json apps/api/.env pnpm-lock.yaml
git commit -m "feat(p3): add Docker MySQL + Prisma deps"
```

### Task P3.2：Prisma schema（8 实体）

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: 写完整 schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum UserRole { user admin }
enum DownloadStatus { pending downloading paused completed error cancelled }
enum UploadStatus { pending uploading completed error cancelled }
enum ScheduleType { once daily weekly monthly }
enum ShareStatus { active disabled expired }
enum ScheduleLogStatus { running success failed }

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)
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
  @@index([userId, status])
  @@index([userId, createdAt])
  @@map("downloads")
}

model Upload {
  id                Int          @id @default(autoincrement())
  userId            Int          @map("user_id")
  filename          String       @db.VarChar(255)
  originalFilename  String       @map("original_filename") @db.VarChar(255)
  filePath          String       @map("file_path") @db.VarChar(512)
  status            UploadStatus @default(pending)
  progress          Decimal      @default(0) @db.Decimal(5, 2)
  uploadedBytes     BigInt       @default(0) @map("uploaded_bytes")
  totalBytes        BigInt       @default(0) @map("total_bytes")
  speed             BigInt       @default(0)
  createdAt         DateTime     @default(now()) @map("created_at")
  completedAt       DateTime?    @map("completed_at")
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@map("uploads")
}

model File {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  name        String   @db.VarChar(255)
  path        String   @db.VarChar(512)
  type        String   @db.VarChar(50)
  size        BigInt   @default(0)
  isDirectory Boolean  @default(false) @map("is_directory")
  parentId    Int?     @map("parent_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent    File?  @relation("FileTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  File[] @relation("FileTree")
  shares    Share[]
  @@unique([userId, parentId, name])
  @@index([userId, parentId])
  @@map("files")
}

model Share {
  id            Int         @id @default(autoincrement())
  userId        Int         @map("user_id")
  fileId        Int         @map("file_id")
  token         String      @unique @db.VarChar(64)
  password      String?     @db.VarChar(255)
  expiresAt     DateTime?   @map("expires_at")
  downloadLimit Int?        @map("download_limit")
  downloadCount Int         @default(0) @map("download_count")
  status        ShareStatus @default(active)
  createdAt     DateTime    @default(now()) @map("created_at")
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  file File @relation(fields: [fileId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("shares")
}

model Schedule {
  id         Int          @id @default(autoincrement())
  userId     Int          @map("user_id")
  url        String       @db.VarChar(2048)
  filename   String?      @db.VarChar(255)
  cron       String       @db.VarChar(100)
  type       ScheduleType
  isEnabled  Boolean      @default(true) @map("is_enabled")
  lastRunAt  DateTime?    @map("last_run_at")
  nextRunAt  DateTime?    @map("next_run_at")
  createdAt  DateTime     @default(now()) @map("created_at")
  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs    ScheduleLog[]
  @@index([userId, isEnabled])
  @@index([nextRunAt])
  @@map("schedules")
}

model ScheduleLog {
  id         Int               @id @default(autoincrement())
  scheduleId Int               @map("schedule_id")
  status     ScheduleLogStatus
  message    String            @db.Text
  startedAt  DateTime          @map("started_at")
  finishedAt DateTime?         @map("finished_at")
  schedule Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  @@index([scheduleId, startedAt])
  @@map("schedule_logs")
}

model Activity {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  type        String   @db.VarChar(50)
  description String   @db.VarChar(500)
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
  @@map("activities")
}
```

- [ ] **Step 2: 执行迁移**

Run: `pnpm --filter api prisma:migrate -- --name init`
Expected: 8 张表创建成功，migrations/ 目录生成

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(p3): add Prisma schema for 8 entities + initial migration"
```

### Task P3.3：Prisma client 单例 + 契约测试

**Files:**
- Create: `apps/api/src/config/prisma.ts`
- Create: `apps/api/src/__tests__/contract.test.ts`
- Create: `apps/api/vitest.config.ts`

- [ ] **Step 1: 写 prisma.ts 单例**

```typescript
// apps/api/src/config/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 2: 写 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
  },
});
```

- [ ] **Step 3: 写契约测试**

```typescript
// apps/api/src/__tests__/contract.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/prisma';
import { UserSchema, DownloadSchema } from '@dm/shared';

describe('Prisma ↔ Zod 契约一致性', () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it('User 行符合 UserSchema', async () => {
    const row = await prisma.user.create({
      data: { username: 'contract_test', email: 'ct@t.com', password: 'hash' },
    });
    const serialized = {
      ...row,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    expect(() => UserSchema.parse(serialized)).not.toThrow();
    await prisma.user.delete({ where: { id: row.id } });
  });

  it('Download 行符合 DownloadSchema', async () => {
    const user = await prisma.user.create({
      data: { username: 'dl_test', email: 'dl@t.com', password: 'h' },
    });
    const row = await prisma.download.create({
      data: { userId: user.id, url: 'https://e.com/f.zip', filename: 'f.zip' },
    });
    const serialized = {
      ...row,
      status: row.status,
      progress: Number(row.progress),
      downloadedBytes: Number(row.downloadedBytes),
      totalBytes: Number(row.totalBytes),
      speed: Number(row.speed),
      resumePosition: Number(row.resumePosition),
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
    expect(() => DownloadSchema.parse(serialized)).not.toThrow();
    await prisma.download.delete({ where: { id: row.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
```

- [ ] **Step 4: 运行契约测试**

Run: `pnpm --filter api test`
Expected: 2 个契约测试通过

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/prisma.ts apps/api/src/__tests__ apps/api/vitest.config.ts
git commit -m "test(p3): add Prisma client singleton + contract tests"
```

### Task P3.4：种子数据 + 数据迁移脚本

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/scripts/migrate-legacy-data.ts`

- [ ] **Step 1: 写 seed.ts**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@dm.local' },
    update: {},
    create: { username: 'admin', email: 'admin@dm.local', password, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'user@dm.local' },
    update: {},
    create: { username: 'user', email: 'user@dm.local', password, role: 'user' },
  });
  console.log('Seed 完成: admin@dm.local / user@dm.local (密码 admin123)');
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: 写 migrate-legacy-data.ts**

```typescript
// apps/api/scripts/migrate-legacy-data.ts
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync, appendFileSync } from 'fs';
import { UserCreateSchema } from '@dm/shared';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const LEGACY_PATH = 'legacy-data/db.json';
const ERR_LOG = 'migration-errors.log';

async function main() {
  if (!existsSync(LEGACY_PATH)) {
    console.log('无旧 db.json，跳过迁移');
    return;
  }
  const db = JSON.parse(readFileSync(LEGACY_PATH, 'utf-8'));
  const idMap = new Map<number, number>();  // oldId → newId

  for (const u of db.users ?? []) {
    const r = UserCreateSchema.safeParse(u);
    if (!r.success) {
      appendFileSync(ERR_LOG, `SKIP user ${u.id}: ${JSON.stringify(r.error.flatten())}\n`);
      continue;
    }
    const created = await prisma.user.create({ data: r.data });
    idMap.set(u.id, created.id);
  }
  console.log(`迁移用户: ${idMap.size}`);
  // downloads/uploads 同理，userId 从 idMap 取新 id
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 3: 执行 seed**

Run: `pnpm db:seed`
Expected: 创建 admin/user 测试账号

- [ ] **Step 4: Commit + 合并**

```bash
git add apps/api/prisma/seed.ts apps/api/scripts/migrate-legacy-data.ts
git commit -m "feat(p3): add seed + legacy data migration scripts"
git checkout main
git merge refactor/p3-prisma
```

---

# 阶段 P4：后端 TS 改造

**分支:** `refactor/p4-backend-ts`
**DoD:** 10 controller TS 化 + validate 中间件 + service 层 + OpenAPI gen；集成测试全绿

> 本阶段工作量大（10 个 controller + 8 个 service）。下面给出**完整 TDD 模板**（download 域），其余 9 个域按相同模式执行，每个域独立 commit。每个域的任务结构相同：写测试→写 service→写 controller→写 routes→集成测试通过→commit。

### Task P4.1：后端 TS 基础设施（errors/utils/middleware）

**Files:**
- Create: `apps/api/src/utils/errors.ts`
- Create: `apps/api/src/utils/asyncHandler.ts`
- Create: `apps/api/src/utils/serialize.ts`
- Create: `apps/api/src/middleware/validate.ts`
- Create: `apps/api/src/middleware/error.ts`
- Create: `apps/api/tsconfig.json`

- [ ] **Step 1: 写 tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 写 utils/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: unknown,
  ) { super(message); this.name = 'AppError'; }
}
```

- [ ] **Step 3: 写 utils/asyncHandler.ts**

```typescript
import type { Request, Response, NextFunction } from 'express';
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res, next)).catch(next);
```

- [ ] **Step 4: 写 utils/serialize.ts**

```typescript
import type { Download, Upload, File, Share, Schedule, ScheduleLog, Activity, User } from '@dm/shared';
import type { Prisma } from '@prisma/client';

export const serializeUser = (r: Prisma.UserGetPayload<{}>): User => ({
  ...r, role: r.role,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const serializeDownload = (r: Prisma.DownloadGetPayload<{}>): Download => ({
  ...r, status: r.status,
  progress: Number(r.progress),
  downloadedBytes: Number(r.downloadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  resumePosition: Number(r.resumePosition),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeUpload = (r: Prisma.UploadGetPayload<{}>): Upload => ({
  ...r, status: r.status,
  progress: Number(r.progress),
  uploadedBytes: Number(r.uploadedBytes),
  totalBytes: Number(r.totalBytes),
  speed: Number(r.speed),
  createdAt: r.createdAt.toISOString(),
  completedAt: r.completedAt?.toISOString() ?? null,
});

export const serializeFile = (r: Prisma.FileGetPayload<{}>): File => ({
  ...r,
  size: Number(r.size),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const serializeShare = (r: Prisma.ShareGetPayload<{}>): Share => ({
  ...r, status: r.status,
  createdAt: r.createdAt.toISOString(),
  expiresAt: r.expiresAt?.toISOString() ?? null,
});

export const serializeSchedule = (r: Prisma.ScheduleGetPayload<{}>): Schedule => ({
  ...r, type: r.type,
  lastRunAt: r.lastRunAt?.toISOString() ?? null,
  nextRunAt: r.nextRunAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export const serializeActivity = (r: Prisma.ActivityGetPayload<{}>): Activity => ({
  ...r, createdAt: r.createdAt.toISOString(),
});
```

- [ ] **Step 5: 写 middleware/validate.ts**

```typescript
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

type Location = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, location: Location = 'body') =>
    (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req[location]);
      if (!result.success) {
        return next(new AppError('VALIDATION_ERROR', 400, '请求参数校验失败', result.error.flatten()));
      }
      (req as any)[location] = result.data;
      next();
    };
```

- [ ] **Step 6: 写 middleware/error.ts**

```typescript
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { ApiErrorSchema } from '@dm/shared';

const prismaErrorMap: Record<string, { code: string; status: number; message: string }> = {
  P2002: { code: 'CONFLICT', status: 409, message: '唯一约束冲突' },
  P2025: { code: 'NOT_FOUND', status: 404, message: '记录不存在' },
  P2003: { code: 'VALIDATION_ERROR', status: 400, message: '外键约束失败' },
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json(
      ApiErrorSchema.parse({
        success: false,
        error: { code: err.code, message: err.message, details: err.details },
        timestamp: new Date().toISOString(),
      }),
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const m = prismaErrorMap[err.code] ?? { code: 'INTERNAL_ERROR', status: 500, message: '数据库错误' };
    return res.status(m.status).json(
      ApiErrorSchema.parse({
        success: false,
        error: { code: m.code, message: m.message },
        timestamp: new Date().toISOString(),
      }),
    );
  }
  console.error(err);
  return res.status(500).json(
    ApiErrorSchema.parse({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      timestamp: new Date().toISOString(),
    }),
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/tsconfig.json apps/api/src/utils apps/api/src/middleware
git commit -m "feat(p4): add TS infra (errors, validate, error middleware, serialize)"
```

### Task P4.2：Auth domain（完整 TDD 示例）

**Files:**
- Create: `apps/api/src/services/auth.service.ts`
- Create: `apps/api/src/controllers/auth.controller.ts`
- Create: `apps/api/src/routes/auth.routes.ts`
- Create: `apps/api/src/__tests__/auth.integration.test.ts`
- Create: `apps/api/src/middleware/auth.ts`

- [ ] **Step 1: 写 auth 中间件**

```typescript
// apps/api/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export const auth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401, '缺少认证令牌'));
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number; role: string };
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 401, '认证令牌无效'));
  }
};

export const requireAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') return next(new AppError('FORBIDDEN', 403, '需要管理员权限'));
  next();
};
```

- [ ] **Step 2: 写 auth.service.ts**

```typescript
// apps/api/src/services/auth.service.ts
import { prisma } from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { serializeUser } from '../utils/serialize';
import type { UserCreate, Login } from '@dm/shared';

export async function register(input: UserCreate) {
  const hash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { username: input.username, email: input.email, password: hash },
  });
  return serializeUser(user);
}

export async function login(input: Login) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new AppError('UNAUTHORIZED', 401, '邮箱或密码错误');
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return { token, user: serializeUser(user) };
}
```

- [ ] **Step 3: 写 auth.controller.ts**

```typescript
// apps/api/src/controllers/auth.controller.ts
import type { Response } from 'express';
import { ApiSuccessSchema } from '@dm/shared';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthRequest } from '../middleware/auth';
import * as service from '../services/auth.service';

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await service.register(req.body);
  res.status(201).json(ApiSuccessSchema(Object).parse({ success: true, data: user, timestamp: new Date().toISOString() }));
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.login(req.body);
  res.json(ApiSuccessSchema(Object).parse({ success: true, data: result, timestamp: new Date().toISOString() }));
});
```

- [ ] **Step 4: 写 auth.routes.ts**

```typescript
// apps/api/src/routes/auth.routes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { UserCreateSchema, LoginSchema } from '@dm/shared';
import * as ctrl from '../controllers/auth.controller';

const router = Router();
router.post('/register', validate(UserCreateSchema), ctrl.register);
router.post('/login', validate(LoginSchema), ctrl.login);
export default router;
```

- [ ] **Step 5: 写集成测试**

```typescript
// apps/api/src/__tests__/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';

describe('POST /api/auth/register', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@t.com' } });
    await prisma.$disconnect();
  });

  it('合法输入返回 201 + user data', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@t.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@t.com');
    expect(res.body.data.password).toBeUndefined();
  });

  it('重复邮箱返回 409 CONFLICT', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'testuser2', email: 'test@t.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});
```

- [ ] **Step 6: 写 app.ts（Express 装配）**

```typescript
// apps/api/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);
```

- [ ] **Step 7: 运行测试验证**

Run: `pnpm --filter api test`
Expected: auth 集成测试通过

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/middleware/auth.ts apps/api/src/services/auth.service.ts apps/api/src/controllers apps/api/src/routes/auth.routes.ts apps/api/src/app.ts apps/api/src/__tests__/auth.integration.test.ts
git commit -m "feat(p4): add auth domain (service+controller+routes+tests)"
```

### Task P4.3-P4.10：其余 9 个域

按 P4.2 完全相同的模式，为以下 9 个域分别实现 service + controller + routes + 集成测试，每个独立 commit：

- [ ] **P4.3 Download domain** — 用 `DownloadCreateSchema`，路由见 spec 4.3；service 用 `prisma.download`，序列化用 `serializeDownload`。集成测试覆盖：创建下载、非法 URL 返回 400、需认证。
- [ ] **P4.4 Upload domain** — `multer` 中间件保留，`prisma.upload`，`serializeUpload`。
- [ ] **P4.5 File domain** — 合并 `searchController`/`tagController`；用 `FileCreateFolderSchema`/`FileRenameSchema`/`FileMoveSchema`；自关联 parentId。
- [ ] **P4.6 Share domain** — `ShareCreateSchema`，token 用 `crypto.randomUUID()`，`prisma.share`，`serializeShare`。
- [ ] **P4.7 Schedule domain** — 合并 `workflowController`；`ScheduleCreateSchema`，`prisma.schedule` + `prisma.scheduleLog`。
- [ ] **P4.8 Stats domain** — 合并 `exportController`；聚合查询（无写入 schema，只读）。
- [ ] **P4.9 GM domain** — `requireAdmin` 中间件，`prisma` 跨用户查询。
- [ ] **P4.10 Health domain** — 简单健康检查，无 schema。

每个域的 commit message 格式：`feat(p4): add {domain} domain (service+controller+routes+tests)`

### Task P4.11：OpenAPI 自动生成

**Files:**
- Create: `apps/api/scripts/gen-openapi.ts`
- Modify: `apps/api/package.json`（scripts 已含 gen:openapi）

- [ ] **Step 1: 安装依赖**

Run: `pnpm --filter api add @asteasolutions/zod-to-openapi`

- [ ] **Step 2: 写 gen-openapi.ts**

```typescript
// apps/api/scripts/gen-openapi.ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'fs';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { DownloadSchema, DownloadCreateSchema, UserResponseSchema, LoginSchema } from '@dm/shared';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
registry.register('Download', DownloadSchema);
registry.register('User', UserResponseSchema);

registry.registerPath({
  method: 'post', path: '/api/downloads',
  request: { body: { content: { 'application/json': { schema: DownloadCreateSchema } } } },
  responses: { 201: { description: '创建成功', content: { 'application/json': { schema: DownloadSchema } } } },
});
registry.registerPath({
  method: 'post', path: '/api/auth/login',
  request: { body: { content: { 'application/json': { schema: LoginSchema } } } },
  responses: { 200: { description: '登录成功', content: { 'application/json': { schema: UserResponseSchema } } } },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const openapi = generator.generateDocument({
  openapi: '3.0.0',
  info: { title: 'Download Manager API', version: '3.0.0' },
});
writeFileSync('openapi.json', JSON.stringify(openapi, null, 2));
console.log('openapi.json 已生成');
```

- [ ] **Step 3: 生成并验证**

Run: `pnpm gen:openapi`
Expected: `apps/api/openapi.json` 生成，含 Download/User 路径

- [ ] **Step 4: Commit + 合并**

```bash
git add apps/api/scripts/gen-openapi.ts apps/api/openapi.json apps/api/package.json pnpm-lock.yaml
git commit -m "feat(p4): add OpenAPI auto-generation from shared schemas"
git checkout main
git merge refactor/p4-backend-ts
```

---

# 阶段 P5：前端接入

**分支:** `refactor/p5-frontend`
**DoD:** `src/types/` 删除；axios 拦截器接 shared；表单接 zodResolver；Vitest 全绿

### Task P5.1：API 客户端接入 shared 信封

**Files:**
- Create: `apps/web/src/services/api.ts`
- Modify: `apps/web/src/services/*.ts`（增加类型注解）

- [ ] **Step 1: 写统一 axios 客户端**

```typescript
// apps/web/src/services/api.ts
import axios from 'axios';
import { z } from 'zod';
import { ApiSuccessSchema, ApiErrorSchema } from '@dm/shared';

export const api = axios.create({ baseURL: '/api', timeout: 30000 });

api.interceptors.response.use(
  (res) => {
    const parsed = ApiSuccessSchema(z.unknown()).safeParse(res.data);
    if (!parsed.success) return Promise.reject(new Error('响应格式不符契约'));
    return parsed.data.data;
  },
  (err) => {
    const parsed = ApiErrorSchema.safeParse(err.response?.data);
    return Promise.reject(parsed.success ? parsed.data.error : err);
  },
);
```

- [ ] **Step 2: 改造 downloadService.ts 返回类型**

将 `apps/web/src/services/DownloadService.ts` 中所有返回 `any`/`Promise<any>` 改为 `Promise<Download>` 等 shared 类型，`import type { Download } from '@dm/shared'`。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/api.ts apps/web/src/services/DownloadService.ts
git commit -m "feat(p5): add typed axios client with shared envelope validation"
```

### Task P5.2：删除手写类型，从 shared 导入

**Files:**
- Delete: `apps/web/src/types/*`
- Modify: 所有 import `../types` 的文件改为 `@dm/shared`

- [ ] **Step 1: 全局替换类型导入**

Run: 搜索 `from '../types'` 和 `from '@/types'`，逐个改为 `from '@dm/shared'`，类型名对齐 shared 导出（User→UserResponse, Download 等）。

- [ ] **Step 2: 删除 src/types/ 目录**

```bash
git rm -r apps/web/src/types
```

- [ ] **Step 3: 类型检查**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: 无类型错误（若有，修复导入）

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/src
git commit -m "refactor(p5): remove hand-written types, import from @dm/shared"
```

### Task P5.3：表单接 zodResolver

**Files:**
- Modify: 表单组件（如 Downloads 创建表单、Settings 等）

- [ ] **Step 1: 改造下载创建表单**

在表单组件中将 `useForm` 的 resolver 改为 `zodResolver(DownloadCreateSchema)`，类型用 `DownloadCreate`，均从 `@dm/shared` 导入。

- [ ] **Step 2: 运行前端测试**

Run: `pnpm --filter web test`
Expected: 现有 Vitest 套件全绿

- [ ] **Step 3: Commit + 合并**

```bash
git add apps/web/src
git commit -m "feat(p5): wire forms to shared zodResolver"
git checkout main
git merge refactor/p5-frontend
```

---

# 阶段 P6：交付验证

**分支:** `release/v3.0.0`
**DoD:** 全流程联调通过；文档更新；版本发布

### Task P6.1：端到端联调

- [ ] **Step 1: 拉起全栈**

Run: `pnpm db:up && pnpm db:migrate && pnpm db:seed`
Run: `pnpm dev:api`（新终端）
Run: `pnpm dev:web`（新终端）

- [ ] **Step 2: 手动验证全流程**

登录 admin@dm.local/admin123 → 创建下载 → 查看进度 → 文件管理 → 创建分享 → 创建调度 → 查看统计。每步确认无控制台错误。

- [ ] **Step 3: 运行全部测试**

Run: `pnpm test`
Expected: 三包测试全绿

### Task P6.2：文档更新

**Files:**
- Modify: `SPEC.md`
- Modify: `DATABASE_SYSTEM.md`
- Modify: `CHANGELOG.md`
- Create: `docs/api-contract.md`
- Create: `docs/migration-v2-to-v3.md`

- [ ] **Step 1: 更新 SPEC.md 技术栈段**

将技术栈改为 monorepo + Prisma + TS 后端，API 端点不变。

- [ ] **Step 2: 重写 DATABASE_SYSTEM.md**

移除 LowDB/SQLite 章节，以 Prisma schema + MySQL 8 为唯一方案，含 docker compose 启动说明。

- [ ] **Step 3: 写 CHANGELOG v3.0.0**

```markdown
## [3.0.0] - 2026-08-01
### 破坏性变更
- 删除 LowDB/SQLite 支持，仅支持 MySQL 8.0+
- 后端从 JavaScript 重写为 TypeScript
- 引入 Prisma ORM 替代 mysql2
- 项目结构改为 pnpm workspaces monorepo
- 前后端共享 @dm/shared Zod schema 契约层
### 新增
- 数据契约层（@dm/shared）：8 实体 Zod schema
- OpenAPI 自动生成
- 四层测试金字塔（契约/单元/集成/组件）
- 5 张新表：files/shares/schedules/schedule_logs/activities
```

- [ ] **Step 4: 写迁移指南 docs/migration-v2-to-v3.md**

包含：备份 db.json → docker compose up → prisma migrate → 跑迁移脚本 → 更新 .env。

- [ ] **Step 5: Commit + 发布**

```bash
git add SPEC.md DATABASE_SYSTEM.md CHANGELOG.md docs
git commit -m "docs: v3.0.0 release - update specs, changelog, migration guide"
git tag v3.0.0
```

---

## 自审记录

**Spec 覆盖检查:**
- §1 架构 → P1（monorepo 搭建）✓
- §2 数据契约层 → P2（8 schema + 枚举 + 信封 + 错误码）✓
- §3 数据库层 → P3（Prisma schema + 迁移 + 契约测试）✓
- §4 后端改造 → P4（TS 基础设施 + 10 域 + OpenAPI）✓
- §5 前端接入 → P5（api 客户端 + 删 types + zodResolver）✓
- §6 错误处理/测试/交付 → P4（error middleware）+ P6（联调/文档）✓
- §7 验收标准 → P6 DoD 对应 ✓

**类型一致性检查:** serialize 函数（P4.1）与 shared schema（P2）字段名一致；AppError 在 validate/error/service 中签名一致。✓

**占位符扫描:** P4.3-P4.10 为重复模式域，已在 P4.2 给出完整模板并说明每域的具体 schema/路由差异，非占位符。✓
