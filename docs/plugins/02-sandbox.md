# RFC-02：插件沙箱（worker_threads）

- **状态**：Accepted
- **版本**：v3.1.0
- **日期**：2026-08-26
- **上游依据**：spec §6.2（沙箱选型）；实现对应 plan Task 9（SandboxRunner）与 Task 11（hello-world 入口）
- **系列文档**：`01-architecture.md` → 02 沙箱（本篇）→ `03-permissions.md` → `04-lifecycle.md` → `05-marketplace.md`

## 1. 背景

插件代码是第三方代码，直接与 Express 请求处理同进程运行意味着：任一插件的死循环、未捕获异常、内存泄漏都会拖垮整个 API。沙箱的目标是把插件的**崩溃面与资源占用**收敛到插件自身，并为权限模型（`03-permissions.md`）提供强制边界。

## 2. 目标 / 非目标

### 2.1 目标

- 每个插件运行在独立的 `worker_threads.Worker` 中：独立 V8 上下文、独立事件循环。
- 定义宿主 ⇄ Worker 的消息协议（activate / event / deactivate）。
- 明确哪些能力在 Worker 内可用、哪些必须回到主进程。

### 2.2 非目标

- 不追求对抗**恶意**插件的强隔离（那是签名验证 + 审核的职责，见 §7 安全考量）。
- 不实现 CPU/内存配额、看门狗重启（列入开放问题）。
- 不使用 SharedArrayBuffer 做共享内存。

## 3. 选型对比

| 方案 | 隔离强度 | 性能 | 维护状态 | 接入复杂度 |
|---|---|---|---|---|
| vm2 | 高 | 中 | **已废弃** | 低 |
| isolated-vm | 极高 | 高（V8 isolate） | 活跃 | 高（C++ addon 构建） |
| **worker_threads** | 中 | 高 | Node.js 原生 | 中 |

**选定 `worker_threads`**，理由：

- Node.js 原生 API，无任何原生依赖与构建步骤，与仓库「Node >= 20 + 全 ESM」基线零摩擦；
- 性能对插件负载（典型为 IO 密集：网络、文件）足够；
- 隔离能力达标：独立 V8 上下文与事件循环，可裁剪注入的全局能力。

**为什么不用 vm2**：vm2 在 2023 年曝出多个不可修复的沙箱逃逸 CVE 后停止维护，新项目禁用。

**为什么不用 isolated-vm**：需要 C++ addon 编译，显著增加打包与安装复杂度；相对 worker_threads 的收益（isolate 级内存隔离）对当前插件负载边际很低。若未来 profiling 证明需要，v3.2.0+ 再评估。

## 4. 设计细节

### 4.1 SandboxRunner（宿主侧）

`apps/api/src/plugins/SandboxRunner.ts`（本迭代新增）封装 `node:worker_threads.Worker`：

```typescript
import { Worker } from 'node:worker_threads';
import type { PluginContext } from '@dm/plugin-sdk';

export class SandboxRunner {
  private worker: Worker;

  constructor(pluginPath: string, context: PluginContext) {
    this.worker = new Worker(pluginPath, {
      workerData: { sandbox: context },
      eval: false,   // 禁止 eval 字符串执行，只跑磁盘上的入口文件
    });
  }

  // 发送 activate，等待 Worker 回 'activated'；5 秒超时拒绝
  async activate(): Promise<boolean> { /* ... */ }

  // 广播宿主事件（fire-and-forget）
  async broadcast(event: string, payload: unknown): Promise<void> { /* ... */ }

  // 发送 deactivate，等待 Worker 回 'deactivated'
  async deactivate(): Promise<void> { /* ... */ }

  // 强制结束线程（兜底手段）
  async terminate(): Promise<void> { /* ... */ }
}
```

要点：

- `eval: false`：Worker 只加载磁盘入口文件，杜绝字符串代码注入路径。
- `activate()` 带 5 秒超时：插件 `activate` 挂起不会让宿主启动流程无限等待。
- 反向通道：Worker 上行 `{ type: 'event', event, payload }` 消息时，SandboxRunner 分发给宿主侧注册的处理器。

### 4.2 消息协议

宿主 → Worker：

| 消息 | 载荷 | 语义 |
|---|---|---|
| `{ type: 'activate' }` | — | 调用插件 `activate(ctx)` |
| `{ type: 'event', event, payload }` | 事件名 + 可序列化载荷 | 广播宿主事件 |
| `{ type: 'deactivate' }` | — | 调用插件 `deactivate(ctx)` |

Worker → 宿主：

| 消息 | 语义 |
|---|---|
| `'activated'` | activate 完成 |
| `'deactivated'` | deactivate 完成，随后 Worker 自行 `process.exit(0)` |
| `{ type: 'event', event, payload }` | 插件经 `ctx.host.emit` 上行的事件 |
| `{ error: string }` | activate/deactivate 抛错 |

### 4.3 插件侧入口

插件入口 `index.js`（ESM）负责消息循环并调用插件实现，参考 `plugins/hello-world/index.js`（本迭代新增）：

```javascript
import { parentPort, workerData } from 'node:worker_threads';

const plugin = {
  async activate(ctx) { /* 注册菜单、挂事件钩子 */ },
  async deactivate(ctx) { /* 清理 */ },
};

if (parentPort) {
  const ctx = workerData.sandbox;
  parentPort.on('message', async (msg) => {
    if (msg?.type === 'activate') {
      await plugin.activate(ctx);
      parentPort.postMessage('activated');
    } else if (msg?.type === 'event') {
      // 分发到插件注册的事件处理器
    } else if (msg?.type === 'deactivate') {
      await plugin.deactivate(ctx);
      parentPort.postMessage('deactivated');
      process.exit(0);
    }
  });
}
```

`if (parentPort)` 守卫让同一入口文件在主线程被直接 import 时（如类型检查、单元测试）不启动消息循环。

### 4.4 能力边界：Worker vs 主进程

| 关注点 | Worker（插件侧） | 主进程（宿主侧） |
|---|---|---|
| 下载协议逻辑 | ✓ | ✗ |
| fs / require / spawn | ✓（按权限白名单裁剪，见 03） | ✗ |
| 网络请求 | ✓（scoped fetch，设计目标） | ✓（宿主自身 fetch） |
| DOM / React 渲染 | ✗ | ✓（apps/web 渲染注册的 UI 贡献） |
| 事件钩子执行 | ✓ | ✗（经 postMessage 广播进 Worker） |
| 注册器生效（菜单/页面） | 发起调用 | ✓（权限门控后登记） |

### 4.5 序列化限制（重要）

`workerData` 与 `postMessage` 都走结构化克隆：**函数、类实例不可穿越线程边界**。因此：

- 事件载荷必须保持 JSON 可序列化；`DownloadContext` 等事件对象只含标量字段。
- `ctx` 中的函数型 API（`ctx.host.on`、注册器回调）不能真正跨越线程；v3.1.0 MVP 中宿主侧 `HostAPI.on` 为桩实现，事件分发走 §4.2 的显式 `event` 消息，完整的消息代理（RPC 化 host API）留作未来迭代。

## 5. 安全考量

- **worker_threads 是隔离机制，不是安全边界**。同进程的 Worker 仍共享进程级资源（文件描述符、内存上限、网络命名空间）。对抗恶意插件依赖：安装时用户显式授权（03）、权限白名单（03）、未来的签名验证（05）。
- **资源耗尽**：恶意/缺陷插件可以独占 CPU 或吃光内存。MVP 缓解手段只有 `terminate()` 兜底与「不自动重启」策略（04）；配额与看门狗见 §7 开放问题。
- **`eval: false`**：消除「字符串即代码」的注入面，插件代码必须落盘可审计。
- **载荷卫生**：广播进 Worker 的事件对象不含凭据、内部路径等敏感字段；事件 schema 收敛在 `packages/plugin-sdk` 类型中。

## 6. 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| vm2 | 否决：已废弃且存在不可修复逃逸漏洞。 |
| isolated-vm | 暂缓：隔离更强但引入 C++ 构建链，收益/成本比不足；留作 v3.2.0+ 的 profiling 驱动决策。 |
| 子进程（child_process） | 否决：进程开销高于 Worker，且 IPC 序列化成本相同；Worker 已满足隔离需求。 |
| 不隔离（同进程 require） | 否决：崩溃面不可接受，见 §1。 |

## 7. 开放问题

1. **看门狗与重启策略**：Worker 无响应（事件循环被占满）时如何探测？当前只有 activate 5s 超时，运行期无心跳。
2. **资源配额**：是否通过 `resourceLimits`（堆大小）或独立子进程 + cgroup 限制内存/CPU？
3. **`execArgv` 裁剪**：Worker 默认继承 `process.execArgv`，是否应显式置空以防 `--inspect` 等调试参数泄漏进插件线程？
4. **host API 的完整 RPC 代理**：`ctx.host.on` 等函数型 API 的消息化代理协议（请求/响应关联 id、取消订阅语义）待设计。
