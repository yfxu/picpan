FROM oven/bun:1.3.9-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

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

# Standalone Next.js server + bundled node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Uncomment when a public/ directory exists:
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Sharp native binaries are not reliably included in the standalone trace
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

# Prisma CLI + engines needed to run `migrate deploy` at startup.
# Copy the whole @prisma scope so the CLI's transitive deps (@prisma/debug,
# @prisma/get-platform, @prisma/fetch-engine, ...) come along — the Next.js
# standalone trace only includes the client's deps, not the CLI's.
# Invoke the real entry (prisma/build/index.js) from entrypoint.sh rather than
# the .bin/prisma symlink — COPY dereferences the symlink into .bin/, which
# breaks the CLI's relative lookup of its *.wasm assets.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./entrypoint.sh"]
