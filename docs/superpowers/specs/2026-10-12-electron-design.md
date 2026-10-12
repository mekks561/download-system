# Electron 外壳重建设计决策（v3.1.0）

**状态**：Accepted（PoC 2026-10-12 全绿）→ 用户 sign-off 后进入 plan 起草
**替代**：原 v3.1.0 design spec §1 L55-101、§3 L107-142（假设 apps/desktop "已有 Electron 32 + MariaDB" 从未落地，属过时架构图）

---

## 0. 事实基线

| 项 | 现实 |
|---|---|
| spec 写的 apps/desktop 状态 | **从未真正存在**——git history 里没有 `apps/desktop` 目录的创建 commit；spec 是 v2 时代假设壳已存在 |
| S1 首次运行向导 | 已交付于浏览器（web :3000），不依赖 Electron `showOpenDialog` |
| 当前进程编排 | 独立 dev server：api :5001 / web :3000 / gm-admin :3100；**无进程管理器**，各自独立启动 |
| 插件系统 S4 | 已合入 master，SandboxRunner **大量使用 worker_threads** |
| GM 管理台 | apps/gm-admin 独立前端 app（3100） |
| v2 gm-admin 遗产 | 已删（commit 2db4bd1），是"后端 express + 前端 React + 从未联通"的半成品，不是 Electron renderer |
| Electron 版本 | PoC 验证用 32.3.3 |
| Node 版本（PoC） | v25.2.1（Electron 32 内嵌的 Node） |

## 1. 决策 1：壳的角色——Accepted：薄壳（方案 A）

**薄壳** = BrowserWindow + preload IPC，壳只做：窗口管理、preload 桥接 Node API（`showOpenDialog` 等）、应用托盘、单实例锁、应用菜单。**不**：spawn API 子进程、启动 MariaDB、编排进程生命周期。

- v3.1.0 壳只"使用"独立运行的 API（5001）+ web（3000）+ gm-admin（3100）；开发阶段 `dev:api`/`dev:web`/`dev:gm` 各自独立起
- MariaDB 捆绑推迟 v3.2.0（打包时 mariadb-bin 跨平台 native deps）
- **v3.2.0 可升级到"半编排"**：壳 spawn API 子进程 + serve 静态 web/gm-admin 打包产物，MariaDB 仍独立到 v3.2.1

**PoC 贡献**：PoC 全绿让薄壳**风险收敛**（最坏情况 v3.2.0 壳要编排插件宿主时也能直接复用 S4 SandboxRunner，无需重写 scope）

## 2. 决策 2：两个前端窗口策略——Accepted：双窗口（2B）

主进程起两个 BrowserWindow（web + gm-admin），各自指向 vite dev server 或打包产物。理由：
- 不改变 v3.1.0 前端打包边界（web 3000 / gm-admin 3100），不引入 iframe/子应用的跨域/认证桥接复杂度
- 窗口切换是 Electron 应用天然能力，不是"用户体验问题"而是桌面形态的特点
- 托盘菜单提供"显示主界面/显示管理台/退出"导航
- **v3.2.0 可升级到单窗口 + 路由**（壳内置路由，gm-admin 打包产物嵌进 web 窗口），但 v3.1.0 不动前端打包边界

## 3. 决策 3：worker_threads 在 Electron 下的行为——Accepted：零改动

**PoC 结果（2026-10-12）**：Layer 1（纯 Node）4/4 pass + Layer 2（Electron main 32.3.3）4/4 pass，exit 0，无 hang。

| 测试点 | Layer 1 | Layer 2 |
|---|---|---|
| fork Worker 成功 | ✅ | ✅ |
| Worker import hello-world/index.js | ✅ | ✅ |
| activate 回执 ACK（"activated"） | ✅ T+56ms | ✅ T+69ms |
| ctx.host.* host-call 双向 | ✅ | ✅ |
| broadcast → Worker handler | ✅ T+734ms | ✅ T+621ms |
| deactivate + shutdown | ✅ T+1103ms | ✅ T+1131ms |

**结论**：`SandboxRunner`/`PluginHost`/消息协议/`workerData: {manifest}` 在 Electron 主进程里就是原生 Node 行为——`worker_threads` 是 Node 内置模块，Electron 主进程默认就是 Node 上下文，结构化克隆协议与纯 Node 完全一致。**S4 插件架构零改动**即可进壳（v3.2.0 壳要编排插件宿主时可直接复用）。

唯一注意点：Electron BrowserWindow sandbox 不影响主进程 Worker（Worker 在主进程 fork，不受 renderer sandbox 限制）。

## 4. 决策 4：Electron vs Tauri——Accepted：Electron

v3.1.0 用 Electron：
- 无 Rust toolchain 依赖（Tauri 必须装 Rust）
- 与 S4 worker_threads/插件 SDK 同 Node.js 生态
- Electron 32 内嵌 Node 25.2.1，比当前系统 Node 更新
- v3.2.0 可评估 Tauri 体积优势（Tauri 打包体积 ~5MB vs Electron ~100MB），但 3.1.0 不动

## 5. 打包与分发（v3.2.0 范围）

- mariadb-bin 捆绑 → 跨平台 native deps
- electron-builder / electron-forge
- 签名、自动更新

v3.1.0 壳**不做打包**，dev-only（壳只 `loadURL` 指向 dev server 或 `loadFile` 指向 dist），用户仍手动起三个 dev server 再开壳。打包进 v3.2.0。

## 6. 遗留开放问题（plan 阶段落地）

- [ ] apps/desktop 目录结构与 package.json（electron-main 的模块名/入口脚本）
- [ ] 壳的 BrowserWindow 配置：web 窗口 + gm-admin 窗口，默认尺寸、title、窗口间切换菜单
- [ ] preload bridge：暴露哪些 Node API 给 renderer（showOpenDialog 最刚需；IPC 路径安全；contextIsolation）
- [ ] 壳启动顺序：先起 BrowserWindow（loadURL 等待 dev server ready）还是先 ping API 端口
- [ ] 根级 package.json 加 `dev:shell` 脚本（启动壳）；是否加 `dev:all` 一键起 api/web/gm/shell
- [ ] gm-admin 在壳里启动时的路由 base 要不要改（`/gm-admin` 而不是 `/` 避免与 web 冲突）
- [ ] 壳 E2E 测试框架（playwright + electron 还是别的）

---

**下一步**：用户 sign-off → 起草 v3.1.0 壳重建 plan（5-6 个 Task，薄壳方向）→ 进入实现 → 评审 → 合 master
