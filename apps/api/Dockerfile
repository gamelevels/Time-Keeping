# Stage 1 — install all workspace deps with pnpm
FROM node:22-alpine AS installer
RUN npm install -g pnpm@10.33.0
WORKDIR /workspace

# Copy workspace manifests only (keeps this layer cached until lockfile changes)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/validators/package.json packages/validators/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

# Stage 2 — bundle everything into a single file with Bun
FROM oven/bun:1-alpine AS builder
WORKDIR /workspace

# node_modules from installer (includes workspace symlinks + all deps)
COPY --from=installer /workspace/node_modules ./node_modules

# Source code for all packages referenced by the API
COPY packages/config/ packages/config/
COPY packages/db/ packages/db/
COPY packages/validators/ packages/validators/
COPY apps/api/ apps/api/

# Bundle to a single self-contained file (bun target inlines all deps)
RUN cd apps/api && bun build src/index.ts --outdir dist --target bun --minify

# Stage 3 — minimal runtime (just bun + the bundled file)
FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=builder /workspace/apps/api/dist ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3001}/api/health" || exit 1

CMD ["bun", "index.js"]
