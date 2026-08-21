# ---- base：固定 Node 与 pnpm 版本 ----
FROM node:24.19.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
WORKDIR /app

# ---- pruner：裁剪 monorepo ----
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.9 prune @kunlun/web --docker

# ---- installer：按裁剪后的 manifest + lockfile 安装依赖 ----
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# ---- builder：构建 @kunlun/web（生产构建不做类型检查，类型检查由 CI/typecheck 门禁负责）----
FROM base AS builder
ENV NUXT_TYPE_CHECK=false
COPY --from=pruner /app/out/full/ .
COPY --from=installer /app/node_modules/ ./node_modules/
# turbo prune 的 out/full 保留根 tsconfig.json 但不追踪其 extends 的 tsconfig.base.json，
# Vite/oxc 转换源码时需向上加载该基础配置，故显式补入。
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @kunlun/web build

# ---- runner：仅保留生产运行产物，非 root 运行 ----
FROM node:24.19.0-bookworm-slim AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.output/ ./apps/web/.output/
USER nodejs
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/.output/server/index.mjs"]
