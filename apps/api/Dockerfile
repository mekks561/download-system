# apps/api/Dockerfile
# ---------------------------------------------------------------
# 本 Dockerfile 需在项目根目录下构建以访问 packages/shared 依赖：
# docker build -f apps/api/Dockerfile -t dm-api:latest .
# ---------------------------------------------------------------

FROM node:20-alpine AS base

# 1. 环境准备
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm config set registry https://mirrors.huaweicloud.com/repository/npm/ \
    && npm i -g pnpm@10.34.6 \
    && pnpm config set registry https://mirrors.huaweicloud.com/repository/npm/

WORKDIR /app

# 2. 拷贝工作区清单与依赖
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/plugin-sdk/package.json packages/plugin-sdk/
COPY apps/api/package.json apps/api/

# 安装所有依赖（含 tsx 等 devDeps，因为后端是 tsx 直跑 TypeScript）
RUN pnpm install --frozen-lockfile

# 3. 拷贝源码
COPY packages/shared packages/shared
COPY packages/plugin-sdk packages/plugin-sdk
COPY apps/api apps/api

# 4. 编译 SDK 与生成 Prisma Client
# prisma generate 不需要真实数据库连接，给一个占位 URL 避免校验报错
RUN pnpm --filter @dm/plugin-sdk build \
    && DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" \
    pnpm --filter api exec prisma generate

# 5. 运行时配置
ENV NODE_ENV=production \
    PORT=5001

WORKDIR /app/apps/api
EXPOSE 5001

# 数据目录预留（插件注册表、上传、下载根目录）
RUN mkdir -p /app/apps/api/data/plugins /app/apps/api/data/uploads /app/apps/api/data/downloads

CMD ["pnpm", "start"]