#!/bin/sh
set -e

echo "[Entrypoint] 正在检查数据库连接并运行迁移..."
# prisma migrate deploy 会应用所有挂起的迁移，且是生产环境推荐做法。
# 如果数据库还没准备好，depends_on + healthcheck 会在 compose 层挡住，
# 但脚本内仍建议做一层自愈/重试以防万一。
# 必须走 pnpm exec：容器内 prisma 是工作区依赖，npx 在 PATH 里找不到时会
# 联网临时安装 prisma@latest（可能是 RC 大版本），导致迁移卡死或版本不兼容。
pnpm --filter api exec prisma migrate deploy

echo "[Entrypoint] 正在初始化内建插件..."
# 可以在此处运行一些初始化脚本，例如播种默认设置或插件
# pnpm --filter api exec tsx scripts/seed-gm.ts

echo "[Entrypoint] 启动 API 服务..."
# 使用 tsx 直接运行以支持 TypeScript
exec pnpm --filter api start
