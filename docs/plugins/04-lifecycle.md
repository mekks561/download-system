# RFC-04：插件生命周期

- **状态**：Accepted
- **版本**：v3.1.0
- **日期**：2026-08-26
- **上游依据**：spec §6.4（生命周期事件）；实现对应 plan Task 10（PluginHost）
- **系列文档**：`01-architecture.md` → `02-sandbox.md` → `03-permissions.md` → 04 生命周期（本篇）→ `05-marketplace.md`

## 1. 背景

插件是有状态的外部代码：安装、加载、激活、停用、卸载每一步都有副作用（写文件、起线程、注册菜单）。生命周期管理的职责是让这些状态**可持久化、可恢复、可审计**，并保证宿主重启后现场一致。

## 2. 目标 / 非目标

### 2.1 目标

- 定义插件状态机与每个转移的触发条件、副作用。
- 定义事件广播机制：宿主事件如何到达每个活跃插件。
- 定义 `installed.json` 持久化 schema 与崩溃恢复策略。

### 2.2 非目标

- 插件热更新（不重启宿主升级插件版本）：v3.2.0+。
- 插件间事件订阅的权限隔离（当前广播对全部活跃插件无差别）。
- 崩溃自动重启（显式设计为不自动重启，见 §6）。

## 3. 状态机

```text
                安装并授权
                    │
                    ▼
             [installed]
                    │  宿主启动 / enable
                    ▼
              [activated] ◀────────┐
                    │              │ 重新 enable
        deactivate  │              │
                    ▼              │
            [deactivated] ─────────┘
                    │
              卸载  │
                    ▼
            [uninstalled]

   任意加载/运行阶段出错 ──→ [error]（需人工介入，见 §6）
```

| 状态 | 含义 |
|---|---|
| `installed` | 已授权并登记到 `installed.json`，尚未加载 |
| `activated` | Worker 已启动，`activate(ctx)` 已完成 |
| `deactivated` | 已停用（仍保留安装记录，可重新启用） |
| `error` | 加载或运行崩溃，等待人工处理 |
| `uninstalled` | 已删除（终态，记录移除） |

## 4. 各阶段流程

### 4.1 安装

1. 用户批准权限清单（`03-permissions.md` §5）。
2. 插件包落盘到 `plugins/<id>/`（含 `manifest.json` + `entry` 入口）。
3. 写入 `installed.json` 条目，状态 `installed`。
4. （未来迭代）签名校验通过后落盘；v3.1.0 只做本地安装，无远程下载。

### 4.2 宿主启动

对 `installed.json` 中每个 `enabled: true` 的条目：

1. 读 `plugins/<id>/manifest.json`，解析 `PluginManifest`。
2. 构建 `PluginContext`（host API + 权限门控的注册器）。
3. fork `SandboxRunner`（Worker），发送 `activate` 消息。
4. 插件 `activate(ctx)` 执行：
   - UI 插件调用 `ctx.registerMenu(...)` 等（宿主按权限门控，见 `03-permissions.md` §4.2）；
   - 脚本插件挂事件钩子；
   - 下载适配器向宿主下载注册表登记自身（未来迭代，MVP 无此类插件）。
5. 状态置 `activated`；任一步失败 → 状态置 `error`，记录 `lastError`，**继续加载其余插件**（单插件故障不阻塞宿主启动）。

### 4.3 事件广播

宿主在业务事件发生时调用 `PluginHost.broadcast(event, payload)`，经各 `SandboxRunner` 的 `postMessage` 转发到所有活跃 Worker（消息协议见 `02-sandbox.md` §4.2）：

| 事件 | 载荷 | 触发时机 |
|---|---|---|
| `download:start` | `DownloadContext` | 下载任务开始 |
| `download:complete` | `DownloadContext` | 下载完成 |
| `download:error` | `DownloadContext` + 错误信息 | 下载失败 |
| `file:saved` | `FileContext` | 文件落盘 |
| `schedule:trigger` | `ScheduleContext` | 调度器触发 |

广播语义：**并发、不串行化、尽力投递**——宿主不等待 Worker 处理完成；单个 Worker 的阻塞不影响其他插件接收事件。载荷仅含可序列化标量字段（`02-sandbox.md` §4.5）。

### 4.4 停用（deactivate）

1. 宿主向 Worker 发送 `deactivate`。
2. 插件 `deactivate(ctx)` 执行清理（关文件句柄、清定时器）。
3. Worker 回 `deactivated` 并自行退出；宿主兜底 `terminate()`。
4. 状态置 `deactivated`，安装记录保留，可随时重新启用。

### 4.5 卸载（uninstall）

1. 若处于 `activated`，先走 §4.4 停用流程。
2. 删除 `plugins/<id>/` 目录。
3. 从 `installed.json` 移除条目。
4. 已注册的 UI 贡献（菜单等）随 Worker 退出从宿主登记表移除。

> **MVP 注意**：v3.1.0 卸载即物理删除插件目录（包括参考插件 hello-world 自身）；恢复方式是重新从仓库拷贝。远程下载 + 本地缓存（卸载不删缓存）属市场迭代的改进。

## 5. 并发模型

- 多插件并行：每个插件一个 Worker，互不共享堆。
- 事件广播并发投递，宿主不做顺序保证。
- Worker 之间**不能直接通信**；插件需要对外发事件时走 `ctx.host.emit`，由宿主中转广播（含回环给自身之外的活跃插件）。

## 6. 错误恢复

Worker 崩溃（未捕获异常 / `error` 事件）：

1. `PluginHost` 捕获并记录日志（`[PluginHost] failed to load <id>` 或运行期错误）。
2. `installed.json` 中该条目标记 `state: 'error'` 并写入 `lastError`。
3. **不自动重启**：崩溃循环（crash loop）比宕机更危险，留给用户显式操作（重新 enable / 卸载）。
4. UI 侧展示告警（市场前端迭代落地；v3.1.0 可由 `GET /api/plugins/installed` 观察到 `error` 状态）。

## 7. 持久化 schema

`plugins/installed.json`（本迭代新增）：

```json
{
  "hello-world": {
    "version": "1.0.0",
    "path": "hello-world/",
    "enabled": true,
    "approvedAt": "2026-08-26T00:00:00.000Z",
    "state": "activated",
    "lastError": null
  }
}
```

| 字段 | 说明 |
|---|---|
| `version` | 安装时的插件版本（与 manifest 对应） |
| `path` | 相对 `plugins/` 的目录 |
| `enabled` | 宿主启动时是否加载 |
| `approvedAt` | 用户授权时间（审计） |
| `state` | §3 状态机的当前状态 |
| `lastError` | 最近一次错误信息（无则 `null`） |

## 8. 安全考量

- **激活即代码执行**：`activate` 在宿主启动时自动触发，因此「写入 `installed.json`」必须是用户显式授权的结果（`03-permissions.md` §5），任何远程来源的插件包不得绕过授权直接登记。
- **停用必须是可信退出路径**：`deactivate` 依赖插件配合清理；插件不配合时宿主必须能 `terminate()` 强杀（Worker 是协作式退出 + 强制兜底）。
- **状态文件完整性**：`installed.json` 是信任根之一，写入需原子化（未来可加 tmp+rename）；当前由 `PluginHost` 单写者持有，无并发写。
- **故障隔离**：单插件加载失败只影响自身状态，不阻塞宿主与其他插件（§4.2 第 5 步）。

## 9. 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| 崩溃后指数退避自动重启 | 否决（v3.1.0）：插件崩溃多为确定性缺陷，自动重启只会放大日志噪音与资源消耗；人工介入语义更明确。 |
| 状态存数据库（Prisma 表） | 否决：插件系统定位「可选模块」，文件存储使其可被整体移除/备份；且插件状态无需参与业务查询与事务。 |
| 事件串行化投递（保序） | 否决：保序会把最慢插件的延迟传染给全部插件；事件语义本身是通知，无序可接受。 |
| 停用不退出 Worker（挂起） | 否决：挂起的 Worker 仍占内存且状态不可信；退出 + 重激活的语义最干净。 |

## 10. 开放问题

1. **enable/disable 的即时生效**：v3.1.0 中 enable 需重启宿主、disable 走 deactivate；市场 API 的 `enable/disable` 端点为骨架（`05-marketplace.md` §4），即时生效随前端迭代补齐。
2. **事件订阅的权限维度**：是否允许插件声明「只订阅 download:*」（类比权限模型）？当前广播无差别投递。
3. **deactivated 的 Worker 退出超时**：`deactivate` 无超时上限，插件清理逻辑挂起时会拖慢宿主关停；需要超时 + 强制 terminate。
4. **状态机与 API 的一致性**：`installed.json` 状态由 PluginHost 内部迁移，外部直接编辑文件可能造成与内存态不一致；未来应收敛为只经 API 变更。
