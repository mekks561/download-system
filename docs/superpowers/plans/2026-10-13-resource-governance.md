# Resource Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建资源治理中心，实现存储概览、软配额预警与过期文件自动清理策略。

**Architecture:** 
- 后端：新增 `ResourceService` 处理文件系统扫描与聚合统计，通过 `node-cron` 执行治理 Job。
- 前端：新增 `GovernancePage` 使用 `recharts` 展示资源分布，并提供策略管理界面。
- 数据：新增 `StorageStats` 模型存储快照，`AppSetting` 存储 JSON 格式治理策略。

**Tech Stack:** Node.js, Express, Prisma, React 19, Tailwind CSS, Recharts.

---

### Task 1: 数据库模型与基础 Service 实现

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/services/resource.service.ts`
- Modify: `apps/api/src/services/activity.service.ts`

- [ ] **Step 1: 在 schema.prisma 中新增 StorageStats 模型**
```prisma
model StorageStats {
  id          Int      @id @default(autoincrement())
  totalBytes  BigInt   @map("total_bytes")
  downloadDir BigInt   @map("download_dir_bytes")
  uploadDir   BigInt   @map("upload_dir_bytes")
  pluginDir   BigInt   @map("plugin_dir_bytes")
  dbSize      BigInt   @map("db_size_bytes")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("storage_stats")
}
```

- [ ] **Step 2: 执行数据库迁移**
Run: `pnpm --filter api prisma migrate dev --name add_storage_stats`

- [ ] **Step 3: 实现 ResourceService.scanStorage()**
实现递归统计目录大小的逻辑，并计算数据库体积。
```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/prisma';

export async function getDirSize(dirPath: string): Promise<bigint> {
  let size = 0n;
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      size += await getDirSize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      size += BigInt(stats.size);
    }
  }
  return size;
}

export async function scanAndSaveStats() {
  const downloadDir = process.env.DM_DOWNLOAD_ROOT || './downloads';
  const uploadDir = process.env.UPLOAD_PATH || './uploads';
  const pluginDir = './data/plugins';

  const [dSize, uSize, pSize] = await Promise.all([
    getDirSize(downloadDir).catch(() => 0n),
    getDirSize(uploadDir).catch(() => 0n),
    getDirSize(pluginDir).catch(() => 0n),
  ]);

  // 模拟 DB 大小统计 (MySQL 可通过查询 information_schema 获取)
  const dbSize = 0n; 

  return await prisma.storageStats.create({
    data: {
      totalBytes: dSize + uSize + pSize + dbSize,
      downloadDir: dSize,
      uploadDir: uSize,
      pluginDir: pSize,
      dbSize,
    }
  });
}
```

- [ ] **Step 4: 记录扫描活动**
在 `Activity` 表中记录 "SYSTEM_STORAGE_SCAN" 事件。

- [ ] **Step 5: Commit**
```bash
git add apps/api/prisma/schema.prisma apps/api/src/services/resource.service.ts
git commit -m "feat: add storage stats model and resource service"
```

---

### Task 2: 策略引擎与自动化清理 Job

**Files:**
- Modify: `apps/api/src/services/resource.service.ts`
- Modify: `apps/api/src/services/schedule-executor.service.ts`

- [ ] **Step 1: 实现清理逻辑**
在 `ResourceService` 中新增 `cleanupExpiredResources()`。
```typescript
export async function cleanupExpiredResources(days: number) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);

  // 1. 清理过期分享关联的文件记录
  const expiredShares = await prisma.share.findMany({
    where: { expiresAt: { lt: expiryDate } },
    include: { file: true }
  });
  
  // TODO: 物理删除逻辑
  
  // 2. 清理临时 .part 文件
  // ...
}
```

- [ ] **Step 2: 注册定时任务**
在 `schedule-executor.service.ts` 中新增每晚执行的治理任务。

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: add resource cleanup policy engine"
```

---

### Task 3: 后端 API 与 Schema 对接

**Files:**
- Modify: `packages/shared/src/schemas/gm.ts`
- Create: `apps/api/src/controllers/gm-storage.controller.ts`
- Modify: `apps/api/src/routes/gm.routes.ts`

- [ ] **Step 1: 定义共享 Schema**
```typescript
export const GmStorageStatsSchema = z.object({
  totalBytes: z.string(),
  downloadDir: z.string(),
  uploadDir: z.string(),
  pluginDir: z.string(),
  dbSize: z.string(),
  createdAt: z.string(),
});
```

- [ ] **Step 2: 实现 Controller 与路由**
暴露 `GET /api/gm/storage/stats` 和 `POST /api/gm/storage/cleanup`。

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: expose storage governance api"
```

---

### Task 4: 前端治理中心页面实现

**Files:**
- Create: `apps/gm-admin/src/pages/GovernancePage.tsx`
- Modify: `apps/gm-admin/src/App.tsx`
- Modify: `apps/gm-admin/src/components/Layout.tsx`

- [ ] **Step 1: 安装 Recharts**
Run: `pnpm --filter gm-admin add recharts`

- [ ] **Step 2: 实现 GovernancePage**
包含存储占比饼图、TOP 占用列表、策略开关。

- [ ] **Step 3: 路由与导航集成**

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: implement gm governance center frontend"
```
