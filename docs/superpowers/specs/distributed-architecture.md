# 分布式下载节点架构设计 (Scheme C)

## 1. 核心目标
将下载任务的执行与元数据管理解耦，支持横向扩展下载节点（Worker），解决单机带宽与磁盘 I/O 瓶颈。

## 2. 架构组件

### 2.1 Master (控制节点 - `apps/api`)
- **职责**:
  - 提供 RESTful API 供 Web/Admin 端调用。
  - 维护任务数据库 (MySQL) 与全局配置。
  - **调度中心 (Scheduler)**: 负责监控 Worker 状态，并将新任务指派给最优 Worker。
  - **消息总线 (Message Bus)**: 使用 Redis 作为任务分发与状态上报的通道。
  - **通知代理**: 接收 Worker 的进度消息，通过 Socket.io 转发给前端。

### 2.2 Worker (下载节点 - `apps/worker`)
- **职责**:
  - **任务执行**: 运行真正的 HTTP 或 BT 下载引擎。
  - **本地存储**: 负责管理挂载的磁盘空间。
  - **状态心跳**: 定期向 Master 上报负载信息（CPU、内存、磁盘余量、活跃任务数）。
  - **插件处理**: 在本地执行视频预览、分类等后处理任务。

### 2.3 Redis (通讯层)
- **Channels**:
  - `tasks:dispatch`: Master 发布新任务。
  - `tasks:control`: Master 发布暂停/取消指令。
  - `worker:heartbeat`: Worker 上报健康状态。
  - `tasks:updates`: Worker 上报实时进度。

## 3. 核心流程

### 3.1 任务创建与分发
1. 用户在前端提交磁力链接。
2. Master 校验权限与配额。
3. **调度策略**: Master 查找当前活跃任务最少且磁盘空间充足的 Worker。
4. Master 在数据库创建任务记录，标记为 `pending`，并分配 `workerId`。
5. Master 向 Redis 发送分发指令。
6. 目标 Worker 接收指令，开始下载，状态变更为 `downloading`。

### 3.2 实时进度同步
1. Worker 内部引擎产生进度数据。
2. Worker 通过 Redis `tasks:updates` 频道发送压缩后的进度包。
3. Master 监听该频道，更新数据库（按需）并通过 Socket.io 推送给用户。

### 3.3 文件访问
- **方案**: Master 充当文件网关。当用户请求下载已完成的文件时，Master 根据任务记录找到对应的 `workerId`，并从 Worker 节点通过内网流式读取数据返回给用户（或直接跳转至 Worker 节点的公开 URL）。

## 4. 技术栈变更
- **引入 Redis**: 作为核心通讯与缓存层。
- **Monorepo 新增**: `apps/worker` 目录，复用 `packages/shared` 中的协议与模型。
- **配置扩展**: 新增 `WORKER_ID` 和 `MASTER_URL` 等环境变量。
