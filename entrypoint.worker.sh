#!/bin/sh
set -e

echo "[Entrypoint] 启动 Worker 服务..."
# Worker 节点不需要运行迁移，直接启动
exec pnpm --filter worker start
