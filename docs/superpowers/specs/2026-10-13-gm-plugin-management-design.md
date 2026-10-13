# GM 插件管理中心设计文档 (2026-10-13)

## 1. 概述
本文档详细说明了 Download Manager GM 后台“插件管理中心”的设计方案。该功能旨在为管理员提供对全站扩展插件的实时监控与运维管控能力。

## 2. 核心目标
- **实时监控**：展示所有已安装插件的 ID、版本、当前运行状态及错误日志。
- **生命周期管控**：支持手动启用、禁用插件，或强制卸载异常插件。
- **零配置接入**：基于现有的 `PluginHost` 内存状态，实现轻量化的实时代理。

## 3. 架构设计

### 3.1 后端实现 (apps/api)
- **服务层 (`GmService`)**：
    - 注入全局单例 `PluginHost`。
    - 实现 `listPlugins`：调用 `pluginHost.listInstalled()` 获取激活插件，并读取 `installed.json` 获取所有已安装条目（含禁用/错误状态）。
    - 实现 `togglePlugin`：根据当前状态调用 `loadPlugin` 或 `unload`，并更新 `installed.json`。
    - 实现 `uninstallPlugin`：调用 `pluginHost.uninstall(id)`。
- **路由层 (`gm.routes.ts`)**：
    - `GET /api/gm/plugins`: 返回插件列表。
    - `POST /api/gm/plugins/:id/toggle`: 切换状态。
    - `DELETE /api/gm/plugins/:id`: 彻底删除。
- **权限控制**：所有端点必须通过 `requireGmAuth` 中间件，仅限 GM 管理员访问。

### 3.2 前端实现 (apps/gm-admin)
- **页面设计**：
    - **Dashboard 风格**：采用深色工业化 UI，突出状态指示灯。
    - **状态标签**：`ACTIVATED` (绿色), `DISABLED` (灰色), `RUNTIME_ERROR` (红色呼吸灯)。
    - **错误诊断**：点击错误状态可弹出抽屉展示 `lastError` 堆栈。
- **交互逻辑**：
    - 启用/禁用操作实时反馈。
    - 卸载操作需二次确认。

### 3.3 共享契约 (packages/shared)
- 定义 `GmPluginResponse` 与 `GmPluginAction` 类型。
- 确保前后端数据交换的类型安全性。

## 4. 数据流图
1. GM 前端发起 `GET /plugins` 请求。
2. API 路由验证 GM JWT。
3. `GmService` 访问 `PluginHost` 内存状态并合并 `installed.json` 数据。
4. 返回序列化后的插件信息清单。
5. 前端渲染卡片/表格，并根据 `state` 字段应用视觉样式。

## 5. 异常处理
- **越界防护**：卸载插件时，`PluginHost` 必须校验路径是否在插件根目录内，防止目录遍历攻击。
- **状态不一致**：如果操作失败（如 Worker 启动超时），后端将状态置为 `error` 并持久化错误消息。
- **并发控制**：插件状态变更期间锁定操作按钮，防止短时间内重复触发激活/禁用。

## 6. 测试计划
- **单元测试**：测试 `GmService` 与 `PluginHost` 的交互逻辑。
- **集成测试**：模拟 GM 登录并调用插件管控端点，验证 `installed.json` 的更新。
- **UI 测试**：验证不同状态插件的视觉表现与错误堆栈的展示。
