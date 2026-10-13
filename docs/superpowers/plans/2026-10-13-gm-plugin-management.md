# GM 插件管理中心实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 GM 管理后台实现插件管理功能，支持实时监控、启用/禁用及卸载插件。

**Architecture:** 扩展 `GmService` 以访问单例 `PluginHost`，通过 `/api/gm/plugins` 端点暴露状态，并在 `gm-admin` 前端构建响应式的监控面板。

**Tech Stack:** TypeScript, Express, Prisma, React, Tailwind CSS, Zod.

---

### Task 1: 定义共享契约与类型

**Files:**
- Modify: `packages/shared/src/schemas/gm.ts`

- [ ] **Step 1: 添加插件响应与操作的 Zod Schema**

```typescript
// 在 packages/shared/src/schemas/gm.ts 中添加
export const GmPluginResponseSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  state: z.enum(['installed', 'activated', 'deactivated', 'error', 'uninstalled']),
  enabled: z.boolean(),
  lastError: z.string().nullable(),
  permissions: z.array(z.string()).optional(),
});

export type GmPluginResponse = z.infer<typeof GmPluginResponseSchema>;

export const GmPluginToggleSchema = z.object({
  enabled: z.boolean(),
});
```

- [ ] **Step 2: 运行类型检查确保无误**
Run: `pnpm --filter @dm/shared typecheck`
Expected: PASS

---

### Task 2: 后端 Service 层实现

**Files:**
- Modify: `apps/api/src/services/gm.service.ts`

- [ ] **Step 1: 在 GmService 中注入 PluginHost 引用并实现核心逻辑**

```typescript
// 修改 apps/api/src/services/gm.service.ts
import { PluginHost } from '../plugins/PluginHost';
// 注意：需从全局注入或获取 PluginHost 实例，假设已在 app.ts 中初始化并导出
import { pluginHost } from '../app'; 

export async function listPlugins() {
  const summary = pluginHost.listInstalled();
  // 需从 pluginHost 内部获取更详细的信息，或扩展 listInstalled
  return summary; 
}

export async function togglePlugin(id: string, enabled: boolean) {
  if (enabled) {
    await pluginHost.loadAll(); // 或者实现更细粒度的 loadPlugin(id)
  } else {
    // 调用卸载或停止逻辑
  }
}

export async function uninstallPlugin(id: string) {
  await pluginHost.uninstall(id);
}
```

- [ ] **Step 2: 编写单元测试验证逻辑**
- Test: `apps/api/src/services/gm.service.test.ts`
- Run: `pnpm --filter @dm/api test gm.service.test.ts`
Expected: PASS

---

### Task 3: 后端 Controller 与路由集成

**Files:**
- Modify: `apps/api/src/controllers/gm.controller.ts`
- Modify: `apps/api/src/routes/gm.routes.ts`

- [ ] **Step 1: 实现 Controller 方法**

```typescript
// apps/api/src/controllers/gm.controller.ts
export const plugins = asyncHandler(async (_req: GmAuthRequest, res: Response) => {
  ok(res, await service.listPlugins());
});

export const togglePlugin = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;
  await service.togglePlugin(id, enabled);
  ok(res, { success: true });
});

export const uninstallPlugin = asyncHandler(async (req: GmAuthRequest, res: Response) => {
  await service.uninstallPlugin(req.params.id);
  ok(res, { success: true });
});
```

- [ ] **Step 2: 注册 API 路由**

```typescript
// apps/api/src/routes/gm.routes.ts
router.get('/plugins', ctrl.plugins);
router.post('/plugins/:id/toggle', validate(GmPluginToggleSchema), ctrl.togglePlugin);
router.delete('/plugins/:id', ctrl.uninstallPlugin);
```

---

### Task 4: 前端 API Client 与 Service 更新

**Files:**
- Modify: `apps/gm-admin/src/services/gm.ts`

- [ ] **Step 1: 增加插件管理相关的 API 调用**

```typescript
// apps/gm-admin/src/services/gm.ts
export interface GmPluginRow {
  id: string;
  version: string;
  state: 'activated' | 'deactivated' | 'error' | 'installed' | 'uninstalled';
  enabled: boolean;
  lastError: string | null;
}

export async function listPlugins(): Promise<GmPluginRow[]> {
  const res = await api.get('/gm/plugins');
  return res.data;
}

export async function togglePlugin(id: string, enabled: boolean): Promise<void> {
  await api.post(`/gm/plugins/${id}/toggle`, { enabled });
}

export async function uninstallPlugin(id: string): Promise<void> {
  await api.delete(`/gm/plugins/${id}`);
}
```

---

### Task 5: 前端 UI - 插件管理页面

**Files:**
- Create: `apps/gm-admin/src/pages/PluginsPage.tsx`

- [ ] **Step 1: 构建插件列表与管控界面**
参照 `plugin-mockup.html` 的设计，使用 Tailwind 和 Lucide 实现。

- [ ] **Step 2: 实现状态切换与卸载确认逻辑**
使用 `ConfirmDialog` 处理卸载动作。

---

### Task 6: 前端集成与路由配置

**Files:**
- Modify: `apps/gm-admin/src/App.tsx`
- Modify: `apps/gm-admin/src/components/Layout.tsx`

- [ ] **Step 1: 注册新页面路由**

```tsx
// apps/gm-admin/src/App.tsx
<Route path="/plugins" element={<RequireAuth><PluginsPage /></RequireAuth>} />
```

- [ ] **Step 2: 在侧边栏添加“插件管理”入口**

```tsx
// apps/gm-admin/src/components/Layout.tsx
{ label: '插件管理', icon: <Box size={20} />, path: '/plugins' }
```

---

### Task 7: 全链路验证

- [ ] **Step 1: 启动前后端服务**
- [ ] **Step 2: 模拟插件报错，验证前端红色呼吸灯显示**
- [ ] **Step 3: 验证禁用/启用操作是否同步更新 installed.json**
- [ ] **Step 4: 验证卸载操作是否物理删除插件目录**
