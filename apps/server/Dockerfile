FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
RUN echo "node-linker=hoisted" > .npmrc
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM base AS builder
WORKDIR /app
# Copy workspace config so pnpm can resolve
COPY --from=deps /app/.npmrc ./
COPY --from=deps /app/node_modules ./node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server ./apps/server
WORKDIR /app/apps/server
RUN pnpm build

# ── Production ──
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/

RUN chown -R appuser:nodejs /app
USER appuser

WORKDIR /app/apps/server
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
CMD ["node", "dist/index.js"]
