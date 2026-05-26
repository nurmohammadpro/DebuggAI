# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image: Next.js standalone output
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# App files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./

# Runtime dirs (bind mount in compose in production)
ENV PROJECTS_DIR=/var/lib/debuggai/projects
RUN mkdir -p /var/lib/debuggai/projects && chown -R node:node /var/lib/debuggai/projects /app

# Run as non-root user for security
USER node

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 3000
CMD ["node", "--max-old-space-size=4096", "server.js"]

