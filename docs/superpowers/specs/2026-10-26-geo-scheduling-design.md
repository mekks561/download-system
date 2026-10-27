# Spec: v3.3.0 GM 后台跨地域调度治理补全设计 (方案 B)

## 1. 背景与目标
在 v3.3.0 智能治理阶段，下载管理器需要具备更精细的跨地域调度能力。目前调度逻辑硬编码在后端，GM 后台缺乏可视化配置与 AI 建议的交互能力。本设计旨在通过“AI 驱动 + 人工干预”的模式，补全 GM 后台的调度治理功能。

## 2. 核心架构设计

### 2.1 数据模型 (Prisma)
在 `schema.prisma` 中新增 `GeoPolicy` 模型，用于存储手动规则：
```prisma
model GeoPolicy {
  id          Int      @id @default(autoincrement())
  pattern     String   @unique // 匹配模式，如 "*.google.com" 或 "1.2.3.4/24"
  region      String   // 目标地域，如 "Asia-East"
  priority    Int      @default(0) // 优先级
  isHardLimit Boolean  @default(false) // 是否强制路由
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.2 调度引擎升级 (WorkerManagerService)
重构 `getBestWorker` 逻辑：
1. **模式匹配**：从数据库加载所有 `GeoPolicy`，按 `priority` 降序排列。
2. **硬性限制 (Hard Limit)**：若匹配到 `isHardLimit: true` 的策略，直接在对应地域的可用 Worker 中选出负载最低的一个。
3. **软性限制与 AI 加权**：
   - 获取匹配的 `isHardLimit: false` 策略。
   - 获取 `aiService.suggestBestRegion(url)` 的 AI 建议。
   - 对地域评分进行加权：`Score = (RegionMatch ? 10 : 0) + (AISuggestionMatch ? 5 : 0)`。
   - 最终结合 Worker 的实时负载评分进行决策。

## 3. 界面设计 (GM-Admin)

### 3.1 治理中心新增面板 (GovernancePage)
- **调度策略管理卡片**：
  - 列表展示现有规则。
  - 支持快捷切换“强制模式”。
  - 提供“新建策略”入口。
- **AI 智能调度洞察**：
  - 展示基于流量分析的地域优化建议。
  - “一键采纳”功能，自动填充策略表单。

### 3.2 仪表盘增强 (DashboardPage)
- **地域流量分布图**：通过饼图展示不同地域承载的任务量。
- **调度审计日志**：记录每一次“人工策略覆盖 AI 建议”或“触发强制路由”的事件。

## 4. 实施路径
1. **后端补全**：执行 Prisma 迁移，实现 `GeoPolicy` 的 CRUD 服务和 Controller。
2. **调度重构**：更新 `WorkerManagerService` 逻辑，引入缓存机制（Redis）以保证调度性能。
3. **前端对接**：在 `gm-admin` 中实现策略管理 UI，并与后端 API 对接。
4. **功能验证**：通过 Mock 不同地域的 URL，验证调度是否按预期路由。

---
**审批请求**：请审阅以上设计。如果确认无误，我将开始编写详细的实施计划。
