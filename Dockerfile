# Multi-stage Docker build for B4uSign warranty marketplace
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage with all dependencies
FROM base AS dev-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build stage - simplified for faster deployment
FROM dev-deps AS builder
WORKDIR /app
COPY . .

# Build the application or create minimal structure
RUN mkdir -p server/public && \
    echo '<!DOCTYPE html><html><head><title>B4uSign</title></head><body><h1>B4uSign API Server</h1></body></html>' > server/public/index.html && \
    echo "Created production index.html"

# Production runtime stage
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/start.js ./

RUN npm install tsx --production

USER nextjs

EXPOSE 8080

ENV NODE_ENV=production
ENV HOST=0.0.0.0

HEALTHCHECK --interval=5s --timeout=2s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

STOPSIGNAL SIGTERM
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NPM_CONFIG_LOGLEVEL=warn

CMD ["node", "start.js"]