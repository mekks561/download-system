# RFC-05：插件市场 API

- **状态**：Accepted
- **版本**：v3.1.0
- **日期**：2026-08-26
- **上游依据**：spec §6.5（插件市场 API 草案）；实现对应 plan Task 12（plugins.routes）
- **系列文档**：`01-architecture.md` → `02-sandbox.md` → `03-permissions.md` → `04-lifecycle.md` → 05 市场 API（本篇）

## 1. 背景

插件的分发与管理需要一组宿主 API。v3.1.0 的范围刻意收窄：**只实现 API 骨架 + 静态注册表（仅 hello-world），不做市场前端页面**——前端市场（`apps/web` 内）推到 v3.2.0。这样做让 API 契约先行稳定，前端与远程注册表可以并行演进。

## 2. 目标 / 非目标

### 2.1 目标

- 定义 `/api/plugins/*` 资源模型与端点契约，遵循仓库统一信封 `{ success, data | error, timestamp }`（`packages/shared/src/schemas/api.ts`）。
- MVP 落地只读端点（registry / installed）与本地 install。
- 明确每个端点在 v3.1.0 的实现状态（可用 / 骨架），不夸大能力。

### 2.2 非目标

- 远程注册表（`https://plugins.download-manager.io/...`）、插件包下载与签名验证。
- 市场前端 UI（列表、详情、安装按钮、权限确认弹窗）。
- 评分评论、版本更新通知、插件依赖解析。

## 3. 通用约定

- **挂载点**：`/api/plugins`，注册于 `apps/api/src/app.ts`（与既有 `/api/auth`、`/api/downloads`、`/api/gm` 等并列）。
- **认证**：全部端点挂在 `requireAuth`（`apps/api/src/middleware/auth.ts`）之后，需 Bearer JWT。
- **信封**：成功 `{ success: true, data, timestamp }`；失败 `{ success: false, error: { code, message?, details? }, timestamp }`。
- **路由实现位置**：`apps/api/src/routes/plugins.routes.ts`（本迭代新增）。

## 4. 端点

### 4.1 `GET /api/plugins/registry` — MVP 可用

返回官方注册表。v3.1.0 为**静态列表**，仅含 hello-world：

```json
{
  "success": true,
  "data": {
    "plugins": [
      {
        "id": "hello-world",
        "name": "Hello World",
        "version": "1.0.0",
        "author": "dm-team",
        "description": "Demo plugin: adds a menu item + listens to download events",
        "type": "ui",
        "permissions": [{ "type": "ui", "inject": ["menu"] }]
      }
    ]
  },
  "timestamp": "2026-08-26T00:00:00.000Z"
}
```

### 4.2 `GET /api/plugins/registry/:id` — MVP 可用

返回单个插件详情。MVP 从本地 `plugins/<id>/manifest.json` 读取；不存在返回 `404 NOT_FOUND`。

### 4.3 `POST /api/plugins/install` — MVP 可用（本地安装）

请求体：`{ "id": "hello-world", "version": "1.0.0" }`

v3.1.0 不做远程下载：从本地 `plugins/<id>/` 解析 manifest 并返回，**供调用方走权限确认流程**（`03-permissions.md` §5）。错误码：

| 条件 | 状态 | code |
|---|---|---|
| 缺 `id` | 400 | `MISSING_ID` |
| `version` 与 manifest 不符 | 400 | `VERSION_MISMATCH` |
| 插件不存在 | 404 | `PLUGIN_NOT_FOUND` |

授权通过后的登记（写 `installed.json`）语义见 `04-lifecycle.md` §4.1。

### 4.4 `GET /api/plugins/installed` — MVP 可用

返回 `plugins/installed.json`（本迭代新增）当前内容（schema 见 `04-lifecycle.md` §7），含各插件的 `state` 与 `lastError`。

### 4.5 `POST /api/plugins/:id/enable` — 骨架（501）

设计语义：置 `enabled: true`，插件在下次宿主启动时加载（即时加载为开放问题，`04-lifecycle.md` §10）。**v3.1.0 返回 `501 NOT_IMPLEMENTED`**，提示直接编辑 `installed.json`。

### 4.6 `POST /api/plugins/:id/disable` / `DELETE /api/plugins/:id` — 骨架

设计语义：disable 立即停用（走 `04-lifecycle.md` §4.4）并置 `enabled: false`；DELETE 走 §4.5 卸载流程（停用 → 删目录 → 移除登记）。**v3.1.0 未实现**，随 v3.2.0 市场前端一并落地。

### 4.7 实现状态速查

| 端点 | v3.1.0 | v3.2.0+ |
|---|---|---|
| `GET /registry` | ✅ 静态注册表 | 远程注册表 + 分页/搜索 |
| `GET /registry/:id` | ✅ 本地 manifest | 远程详情 + 版本列表 |
| `POST /install` | ✅ 本地解析返回 manifest | 远程下载 + 签名校验 |
| `GET /installed` | ✅ | — |
| `POST /:id/enable` | 501 骨架 | 即时生效 |
| `POST /:id/disable` | 骨架 | 即时停用 |
| `DELETE /:id` | 骨架 | 完整卸载流程 |

## 5. v3.2.0 路线

- 远程注册表：`https://plugins.download-manager.io/registry`（拉取 + 缓存 + 签名清单）。
- 插件包签名验证（GPG 或 Sigstore），安装前强制校验。
- 版本管理与更新通知（已装版本 vs 注册表最新版）。
- 市场前端：`apps/web` 内市场页（列表 / 详情 / 权限确认 / 已安装管理）。
- 评分与评论。
- 插件依赖解析（plugin A requires plugin B）。

## 6. 安全考量

- **安装即代码执行**：`install` 的后续动作（授权 → 登记 → 下次启动 activate）等价于在宿主机器执行第三方代码。因此 install 只返回 manifest，**授权确认是不可跳过的独立步骤**（`03-permissions.md` §5）。
- **认证基线**：全部端点要求登录用户；未来 install/uninstall 是否收窄为管理员（对齐 GM 后台的角色模型）列入开放问题。
- **路径穿越**：`registry/:id` 与 `install` 以 `id` 拼路径读文件，必须拒绝含 `..` / 路径分隔符的 id（实现侧校验 id 形态为 `[a-z0-9-]+`）。
- **静态注册表的可信边界**：v3.1.0 注册表内容硬编码于宿主代码，无远程输入面；引入远程注册表后，签名验证成为强制前置（§5）。
- **速率限制**：安装/卸载类写端点未来应挂 `express-rate-limit`（仓库已有 `apps/api/src/middleware/rate-limiters.ts` 先例），防滥用。

## 7. 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| v3.1.0 直接做远程注册表 | 否决：签名验证、缓存、可用性都是大坑；先用静态注册表把 API 契约与端到端生命周期（授权→加载→事件→卸载）跑通。 |
| install 端点内联完成授权+登记 | 否决：授权必须是用户显式动作且独立于下载/解析；拆开后 install 可幂等重试，授权记录可审计。 |
| 端点挂载到 `/api/gm/plugins`（GM 后台管插件） | 否决：插件市场是面向全部终端用户的能力，GM 是运维管理面；两者鉴权模型与受众不同（边界见 spec §2.2）。 |
| 注册表数据库存储 | 否决（v3.1.0）：静态列表硬编码即可；远程注册表落地后自然有服务端存储，宿主侧无需建表。 |

## 8. 开放问题

1. **install/enable 的管理员收窄**：是否需要 `role: ADMIN`（对齐 `/api/gm/*`）？涉及「终端用户能否自行装插件」的产品决策。
2. **远程注册表的信任根**：签名公钥如何分发与轮换？注册表服务不可用时的降级（仅已安装可用）？
3. **id 命名空间**：未来开放第三方发布时，如何防抢注/仿冒（命名规范、作者验证）？
4. **enable 即时生效**：不重启宿主的加载路径需要 PluginHost 支持运行期 `loadPlugin`，与事件广播的竞态（加载中途的事件是否投递）待定义。
