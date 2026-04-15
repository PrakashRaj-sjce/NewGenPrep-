# ============================================
# AI Interview Bot - Frontend Dockerfile
# Multi-stage build: Node build → Node serve (standalone)
# ============================================

# --- Stage 1: Install Dependencies ---
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps

# --- Stage 2: Build ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env (API URL injected at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application (standalone output)
RUN npm run build

# --- Stage 3: Production ---
FROM node:20-alpine AS production

LABEL maintainer="Xcelisor Plugins"
LABEL description="AI Interview Bot - Next.js Frontend (Standalone)"

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Expose HTTP port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
