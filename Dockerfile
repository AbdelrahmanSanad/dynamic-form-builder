# syntax=docker/dockerfile:1
#
# Combined image: builds the React SPA and the Fastify API, then ships a single
# runtime that serves both from one origin (so the SameSite=Lax auth cookie
# works without CORS). Intended for single-service hosts like Railway/Render.

# ─── Frontend build ───────────────────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# API base defaults to same-origin "/api", so no build-time URL is needed.
RUN npm run build

# ─── Backend build ────────────────────────────────────────────────────────────
FROM node:20-slim AS backend
# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ ./
RUN npm run build
# Drop dev dependencies for a lean runtime (prisma CLI stays — it's a dependency).
RUN npm prune --omit=dev

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/prisma ./prisma
COPY --from=backend /app/package.json ./package.json
# The built SPA is served from STATIC_DIR (defaults to ./public).
COPY --from=frontend /web/dist ./public

# Pre-create the uploads dir owned by the runtime user. Mount a persistent
# volume here (e.g. Railway Volume at /app/uploads) so files survive redeploys.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node

EXPOSE 4000

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
