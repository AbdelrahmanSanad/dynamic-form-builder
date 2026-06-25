# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS build

# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# Prune dev dependencies for the runtime image.
RUN npm prune --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Pre-create the uploads dir owned by the runtime user. /app is root-owned, so
# the unprivileged `node` user cannot mkdir under it at startup; create it here.
# A named volume mounted at this path inherits this ownership on first use.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 4000

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
