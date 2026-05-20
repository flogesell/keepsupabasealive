# Build with Bun (fast). Run with Node 24 LTS (better-sqlite3 is a Node native addon — not supported by Bun).
FROM oven/bun:1-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Native modules must be compiled against Node 24 — copying from `bun install` breaks at runtime (ABI mismatch).
FROM node:24-alpine AS native-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install better-sqlite3@12.10.0 bindings file-uri-to-path --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/keepsupabasealive.db
ENV DRIZZLE_MIGRATIONS_FOLDER=/app/drizzle
ENV SQLITE_JOURNAL_MODE=DELETE
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache su-exec && \
    addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=native-deps --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=native-deps --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=native-deps --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

EXPOSE 3000
USER root

ENTRYPOINT ["/docker-entrypoint.sh"]
