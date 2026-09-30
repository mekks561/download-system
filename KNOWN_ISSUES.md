# Known Issues - v3.1.0

This document lists known issues, warnings, and technical debt items for the Download Manager v3.1.0 release.

> **当前安全状态（2026-09-30 复验）**：`pnpm audit` 零漏洞。注意必须指定官方 registry 才能扫描：`pnpm audit --registry=https://registry.npmjs.org`（npmmirror 不支持 audit 端点，用默认镜像会漏报）。项目要求 pnpm >= 10.34.6（见 `packageManager` 字段）：overrides 与 onlyBuiltDependencies 配置在 `pnpm-workspace.yaml` 中，旧版 pnpm 不读取。
>
> **v3.0.0 历史状态**：所有已知安全漏洞已于 2026-08-02 修复。后端已从 JavaScript 迁移到 TypeScript（含 Prisma ORM + Zod 校验），项目重构为 pnpm workspaces monorepo（apps/web + apps/api + packages/shared）。

## 📊 Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Security Vulnerabilities | 0 | — | ✅ All Resolved (2026-09-30 复验) |
| TypeScript Type Errors | 0 | — | ✅ Resolved (v3.0.0) |
| Vite Config Warnings | 0 | — | ✅ Resolved (2026-08-02) |
| Functional Bugs (code review) | 0 | — | ✅ All Resolved (2026-08-02) |
| Test Failures | 0 | — | ✅ All Resolved (2026-09-30, api 44/44 + web 236/236) |
| ESLint Warnings | 0 | — | ✅ All Resolved (2026-09-30 全量复验) |
| React 19 Deprecations | 0 | — | ✅ Resolved (2026-08-02, useContext→use) |
| Technical Debt | 1 | Low | Pending (Redis 文档化) |

---

## ✅ ESLint & React 19 Cleanup (2026-08-02)

清理全部剩余 ESLint 警告与 React 19 废弃提示。修复后 ESLint 0 errors / 0 warnings，tsc 0 errors，236/236 测试通过。

**修复内容（24 项 → 0）：**
- **类型安全**：[DownloadService.ts](file:///h:/工作区/download-manager/apps/web/src/services/DownloadService.ts) 的 `signal.reason` 标注为 `'pause' | 'cancel' | undefined`；[SearchFilter.tsx](file:///h:/工作区/download-manager/apps/web/src/components/SearchFilter.tsx) 移除多余的 ref 类型断言；[Downloads.test.tsx](file:///h:/工作区/download-manager/apps/web/src/pages/__tests__/Downloads.test.tsx) 用 `as DownloadItem` 替换 3 处 `as any`。
- **React 19 `use` 迁移**：[Toast.tsx](file:///h:/工作区/download-manager/apps/web/src/components/Toast.tsx) / [notificationService.tsx](file:///h:/工作区/download-manager/apps/web/src/services/notificationService.tsx) / [searchHistoryService.tsx](file:///h:/工作区/download-manager/apps/web/src/services/searchHistoryService.tsx) / [speedLimitService.tsx](file:///h:/工作区/download-manager/apps/web/src/services/speedLimitService.tsx) 的 `useContext` 改为 `use()` hook。
- **State setter 命名**：[useAISearch.ts](file:///h:/工作区/download-manager/apps/web/src/hooks/useAISearch.ts)（`query`→`queryState`）、[usePagination.ts](file:///h:/工作区/download-manager/apps/web/src/hooks/usePagination.ts)、[useSearch.ts](file:///h:/工作区/download-manager/apps/web/src/hooks/useSearch.ts) 将原始 setter 与公开 wrapper 拆分命名（`setPageSize`/`updatePageSize`、`setFilters`/`updateFilters`），公开 API 不变；[Downloads.tsx](file:///h:/工作区/download-manager/apps/web/src/pages/Downloads.tsx) `new Set()` 改为惰性初始化。
- **Effect 副作用**：[useAISearch.ts](file:///h:/工作区/download-manager/apps/web/src/hooks/useAISearch.ts) 将清空 results/suggestions/queryRewrite 的逻辑从 effect 移入 `setQuery` wrapper，消除 `set-state-in-effect`。
- **列表 key**：[AIAssistant.tsx](file:///h:/工作区/download-manager/apps/web/src/components/AIAssistant.tsx) 用值（`pattern`/`rec`）替代数组 index 作为 key。
- **依赖数组**：[SearchFilter.tsx](file:///h:/工作区/download-manager/apps/web/src/components/SearchFilter.tsx)（`handleKeywordChange` 包进 useCallback 后加入 deps）、[WorkflowList.tsx](file:///h:/工作区/download-manager/apps/web/src/components/WorkflowList.tsx)（补 `engine`）。
- **其他**：[DatePicker.tsx](file:///h:/工作区/download-manager/apps/web/src/components/ui/DatePicker.tsx) `new Date()` 移入 useReducer 惰性初始化（render 阶段无副作用）；[useModal.ts](file:///h:/工作区/download-manager/apps/web/src/hooks/useModal.ts) `modalRefs`→`modalRef`；[WorkflowEngine.ts](file:///h:/工作区/download-manager/apps/web/src/services/WorkflowEngine.ts) `console.log`→`console.warn`（保留审计日志，符合 no-console 规则）。

**验证**：`eslint src` → 0/0；`tsc --noEmit -p tsconfig.build.json` → 0 errors；`vitest run` → 236/236 passed。`forwardRef` 用量为 0，无需迁移。

---

## ✅ Resolved in Code Review (2026-08-02)

### Functional Bugs

#### CR-1. 下载在每次进度更新时被取消（Critical）✅
**问题描述**：`useDownloadManager` 的 cleanup `useEffect` 依赖 `[downloads]`，导致每次进度更新（`downloads` 变化）都触发 cleanup，反复调用 `downloadService.cancelDownload`，下载无法正常进行。
**影响范围**：所有下载任务，下载功能基本不可用。
**修复方案**：用 `downloadsRef` 持有最新快照，依赖数组改为 `[]`，cleanup 仅在组件卸载时执行。
**修改文件**：`apps/web/src/hooks/useDownloadManager.ts`

#### CR-2. History 页面数据源断开（Major）✅
**问题描述**：`History.tsx` 从 `useDownloadStore`（zustand）读取下载记录，而 `useDownloadManager` 使用组件局部 `useState`，两个数据源完全断开——下载完成后 History 页面始终为空。
**影响范围**：历史记录页面，跨页面导航后数据丢失。
**修复方案**：将 `useDownloadManager` 的 `downloads` 状态源从局部 `useState` 迁移到共享 `useDownloadStore`，使 Downloads 页与 History 页读取同一 store。回调内部通过 `useDownloadStore.getState()` 取最新状态避免闭包过期。
**修改文件**：`apps/web/src/hooks/useDownloadManager.ts`、`apps/web/src/hooks/__tests__/useDownloadManager.test.tsx`（新增 `beforeEach` 重置 store 保证测试隔离）

#### CR-3. DownloadService 无法识别 AbortError（Major）✅
**问题描述**：`handleError` 仅检查 `error.message === 'pause'/'cancel'`，但 `fetch` 被 `AbortController.abort('pause')` 中断时抛出 `DOMException(name='AbortError')`，其 `message` 是浏览器默认文本（非 'pause'），导致暂停/取消的下载被误判为失败并触发重试。
**影响范围**：直接 fetch 下载路径的暂停/取消功能。
**修复方案**：优先检测 `error.name === 'AbortError'`，再从 `controller.signal.reason` 取 `'pause'/'cancel'` 判定具体意图；Worker 路径仍走 `error.message` 兼容。
**修改文件**：`apps/web/src/services/DownloadService.ts`

#### CR-4. jest-dom matchers 未注册，41 个测试失败（Critical）✅
**问题描述**：`setupTests.ts` 使用 `import '@testing-library/jest-dom/vitest'`（副作用导入）注册 matchers，但 vitest 4 下该副作用导入的 `expect.extend` 不生效，导致所有使用 `toBeInTheDocument` 等匹配器的测试报 `Invalid Chai property: toBeInTheDocument`。共影响 6 个测试文件 41 个用例。
**影响范围**：StatsDashboard、DownloadItem、SearchFilter、NotificationPanel、PerformanceMonitor、ShareManager 的全部组件测试。
**修复方案**：改为显式 `import { expect } from 'vitest'; import * as matchers from '@testing-library/jest-dom/matchers'; expect.extend(matchers);`；保留 `import '@testing-library/jest-dom/vitest'` 仅用于 TypeScript 类型声明。
**修改文件**：`apps/web/src/setupTests.ts`

#### CR-5. auth register 集成测试契约错配（Minor）✅
**问题描述**：`auth.service.register` 已改为返回 `{ token, user }` 对齐 login（修复前端注册后 token=undefined），但集成测试仍断言 `res.body.data.email`（旧契约），导致 `expected undefined to be 'test@t.com'`。
**影响范围**：`auth.integration.test.ts` 1 个用例。
**修复方案**：测试断言改为 `res.body.data.token` + `res.body.data.user.email`。
**修改文件**：`apps/api/src/__tests__/auth.integration.test.ts`

### 安全加固（前序会话已完成，此处归档）

- **Mass Assignment 防护**：share/schedule PATCH 端点新增 Zod 校验 schema（`ShareUpdateSchema`/`ScheduleUpdateSchema`），service 层仅取白名单字段。
- **IDOR 防护**：创建分享前校验 `fileId` 归属当前用户。
- **密码明文存储**：分享密码改用 `bcrypt.hash` 存储。
- **认证限流**：`/api/auth/login`、`/api/auth/register` 挂载 `express-rate-limit`（10 次/15 分钟/IP）；全局限流 100 次/分钟/IP。
- **注册契约对齐**：`register` 返回 `{ token, user }`，与 `login` 一致。
- **账号管理端点**：新增 `PUT /profile`、`POST /change-password`、`POST /logout`、`DELETE /account`。

---

## ✅ Resolved in v3.0.0

### Security Vulnerabilities (All Resolved 2026-08-02)

#### 1. form-data CRLF Injection (High) ✅
**CVE**: CVE-2026-12143 / GHSA-hmw2-7cc7-3qxx
**Resolution**: `axios` 已通过 lockfile 自然升级到 `1.19.0`，该版本将 `form-data` 依赖底线提升至 `^4.0.6`（修复版本）。`apps/web/package.json` 中 axios 版本范围已从 `^1.16.1` 锁定到 `^1.19.0` 以明确安全基线。
**Verification**: `pnpm audit` 确认 form-data 不再出现在漏洞列表。

#### 2. React Router CSRF Bypass (High) ✅
**CVE**: GHSA-qwww-vcr4-c8h2
**Resolution**: 将 `react-router-dom@7.18.2` 迁移到 `react-router@^8.3.0`（React Router v8 官方声明从 v7 升级为 non-breaking）。8 个源文件的 imports 从 `react-router-dom` 改为 `react-router`，React 版本提升至 `^19.2.7` 以满足 v8 的 baseline 要求。
**Modified files**: App.tsx, ProtectedRoute.tsx, Sidebar.tsx, Header.tsx, Layout.tsx, LoginPage.tsx, SharePreview.tsx, Home.tsx
**Verification**: web 包 236/236 测试通过，`tsc --noEmit` 零错误。

#### 3. js-yaml DoS (High, 2 CVEs) ✅
**CVEs**: GHSA-52cp-r559-cp3m, GHSA-h67p-54hq-rp68
**Resolution**: `pm2` 从 `^5.3.0` 升级到 `^7.0.0`，间接将 `js-yaml` 从 4.1.1 提升到 >=4.3.0（修复版本）。同时解决了 pm2 自身的 ReDoS 漏洞（low）。
**Verification**: `pnpm audit` 确认 js-yaml 和 pm2 不再出现在漏洞列表。

#### 4. uuid Buffer Bounds Check (Moderate) ✅
**CVE**: GHSA-w5hq-g745-h8pq
**Resolution**: `uuid` 从 `^9.0.1` 升级到 `^11.1.1`。注意：api 包代码实际使用 Node.js 内置 `crypto.randomUUID()`，未直接 import uuid 包，升级零风险。
**Verification**: `pnpm audit` 确认 uuid 不再出现在漏洞列表。

### Architecture & Tooling

#### 5. Backend JavaScript → TypeScript Migration ✅
**Resolved**: 后端已全部迁移到 TypeScript，启用 `strict: true`，含 `@types/*` 类型声明。`apps/api/src` 全量类型检查通过（`tsc --noEmit` 零错误）。

#### 6. Missing ORM Layer ✅
**Resolved**: 引入 Prisma 6 ORM + 8 张表 schema（users/downloads/uploads/files/shares/schedules/schedule_logs/activities），含 `20260801220404_init` 迁移文件。

#### 7. Missing Docker Configuration ✅
**Resolved**: 已新增 [docker-compose.yml](file:///h:/工作区/download-manager/docker-compose.yml)（MySQL 8.0 服务）和 [apps/api/Dockerfile](file:///h:/工作区/download-manager/apps/api/Dockerfile)。

#### 8. Legacy Jest Test File ✅
**Resolved**: 删除 `apps/api/tests/scheduleController.test.js` 与 `apps/api/jest.config.js`，测试统一由 Vitest 接管。

#### 9. TypeScript Type Mismatches ✅
**Resolved**: 修复 v3.0.0 引入的 4 项类型错误（tsconfig rootDir 冲突、bcryptjs 类型声明、serializeSchedule/serializeActivity 的 null/undefined 转换）。

#### 10. react-window React 19 Compatibility ✅
**Resolved**: `react-window@1.8.11` 的 peerDependencies 已包含 `^19.0.0`，与 React 19 完全兼容。原 KNOWN_ISSUES 中记录的 peer 依赖冲突已不存在。

#### 11. Vite Config ESM Warning ✅
**Resolved**: `apps/api/vitest.config.ts` 重命名为 `vitest.config.mts`，解决 Vite 8 的 `configLoader: 'native'` 对 CommonJS 包中 ESM 语法的警告。同时清理了已删除的 `scheduleController.test.js` 的 exclude 配置。

---

## ✅ ESLint Warnings (Resolved 2026-08-02, 复验 2026-09-30)

原记录的 ~249 条警告（React 19 废弃、no-console、unused-vars、prettier 等）已在 2026-08-02 全量清零。2026-09-30 复验：`apps/web/src` 与 `apps/api/src` 全量 `eslint` 均为 0 errors / 0 warnings。`packages/shared` 仍缺 `lint` script 与对应 eslint 依赖（flat config 未配置），是其唯一的工程化缺口。

---

## ✅ v3.1.0 技术债清理（2026-09-30）

### 1. 依赖漏洞反弹 → 清零

**背景**：KNOWN_ISSUES 原记录「2026-08-02 零漏洞」为快照结论；两个月内 npm 新增通告导致复验时出现 22 个漏洞（6 high / 13 moderate / 3 low）。

**处理**：
- `vitest` 4.1.10 → 4.1.11+（修 `vitest` / `@vitest/mocker` 路径遍历与任意文件读取）
- 传递依赖用 pnpm overrides 强制提版：`js-yaml`（pm2 链）、`nanoid`（vite/postcss 链）、`qs`（express 链）、`undici`（jsdom 链）、`ip-address`、`deepmerge-ts`（prisma 链，大版本提升后 `prisma validate`/`generate` 复验通过）

**踩坑记录**：pnpm 10 起不再读取 `package.json` 的 `pnpm` 字段，配置须放在 `pnpm-workspace.yaml`；`overrides` 还需 pnpm >= 10.34（旧的 10.0.0 静默忽略），故 `packageManager` 同步升级。**这意味着 2026-08-02 之前写在 package.json 里的 `onlyBuiltDependencies` 从未生效过。**

### 2. 集成测试无 DB 守卫 → globalSetup 探活

**背景**：`domains.integration.test.ts` 在数据库不可用时于 `beforeAll` 抛错，整个套件崩溃并掩盖真实断言失败（表现为「6 skipped + 1 failed suite」）。

**处理**：新增 `src/__tests__/helpers/global-setup.ts`，在收集阶段前探活一次并通过 `provide/inject` 注入；4 个依赖 DB 的套件（domains / download / auth / contract）改用 `describe.skipIf(!isDatabaseAvailable())` 优雅跳过。`inject` 未提供值时默认返回 true，避免配置缺失导致「假绿」全跳过。

### 3. domains 集成测试真实缺陷（此前被崩溃掩盖）

**问题**：`prisma.user.upsert({ update: {} })` 不同步 admin 密码，当库中 admin 来自 seed（密码与测试常量 `admin123` 不符）时登录返回 401，`adminLogin.body.data.token` 抛 `TypeError: Cannot read properties of undefined`。
**修复**：`update` 同步写入测试密码与 role，登录失败改为带 status 的可诊断断言。修复后 api 44/44 通过。

### 4. 前端 API Key 暴露（同一轮清理，commit 364ed51）

前端 `AIAssistantService` / `AISearchService` 直接用 OpenAI SDK，Key 经 `VITE_OPENAI_API_KEY` 打进浏览器包。已迁移到后端 `/api/ai` 代理（JWT + 限流 + zod），前端移除 `openai` / `langchain` / `@langchain/openai` 依赖。**遗留提醒：曾暴露的 Key 需在服务商后台轮换。**

### 5. 遗留物与依赖清理（commit 2b11e6f / e80e8b6）

删除 v2 时代产物 `build/`（206MB）、旧 `package-lock.json`、`apps/desktop` 空壳、散落日志；移除未使用依赖 `multer` / `bcrypt` / `uuid` / `express-mongo-sanitize` / `xss-clean` / `jest`；`bcryptjs` 升 3.x 并删除弃用类型垫片。

---

## 🛠 Technical Debt (Remaining)

### 1. Redis Dependency

**Description**: Redis is optional but recommended for production
**Priority**: Low
**Impact**: Without Redis, caching and rate limiting are disabled
**Recommendation**: Document Redis requirements clearly

---

## 📝 Release Notes Note

v3.1.0 安全状态：**`pnpm audit` 零漏洞**（2026-09-30 复验，须指定官方 registry）。v3.0.0 的 5 个历史漏洞（2 high + 2 moderate + 1 low）与 2026-09 新增的 22 个通告（6 high）均已通过依赖升级 + overrides 解决，无需代码 workarounds。

测试状态：**api 44/44 + web 236/236 全部通过**（2026-09-30）。集成测试已加数据库探活守卫，DB 不可用时优雅跳过而非崩溃。

后端监听 `:5001`，前端 Vite 监听 `:3000`。类型检查三个包零错误。

---

**Last Updated**: 2026-09-30
**Version**: v3.1.0
**Security Audit**: ✅ No known vulnerabilities found（`pnpm audit --registry=https://registry.npmjs.org`）
**Code Review**: ✅ 5 项功能缺陷已修复（CR-1 ~ CR-5）；2026-09-30 修复集成测试 admin 登录缺陷
