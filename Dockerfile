FROM oven/bun:1.3.9-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Production-only deps for the runtime image. This is a *complete* dependency
# tree (prisma CLI + all its transitive deps like @prisma/config, effect, and
# sharp's native binaries for the target arch), so `migrate deploy` and the
# server have everything at runtime without hand-picking individual packages.
FROM oven/bun:1.3.9-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.9-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL=postgresql://dummy:dummy@localhost/dummy bunx prisma generate
RUN DATABASE_URL=postgresql://dummy:dummy@localhost/dummy bun run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Complete production node_modules (Prisma CLI + all deps, sharp native binaries)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Standalone Next.js server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Uncomment when a public/ directory exists:
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + migrations + config (prisma.config.ts supplies datasource.url
# for `migrate deploy` in Prisma 7), needed at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./entrypoint.sh"]
