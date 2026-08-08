# ------------------------------------------------------------------
# Dockerfile — Turing Test backend (Express + Socket.IO + Redis)
#
# Multi-stage build: install dependencies in a full node image, then
# copy only what's needed into a slim runtime image, running as a
# non-root user. Image is designed to be built once and promoted
# unchanged across dev/staging/prod (config comes from env vars only —
# see architecture Section 10).
# ------------------------------------------------------------------

# ---- Stage 1: install dependencies ----
FROM node:18-alpine AS deps

WORKDIR /app

# Copy only manifest files first so this layer is cached unless
# dependencies actually change.
COPY package.json package-lock.json* ./

# Install production dependencies only (no devDependencies like nodemon/eslint).
RUN npm ci --omit=dev

# ---- Stage 2: runtime image ----
FROM node:18-alpine AS runtime

# dumb-init ensures SIGTERM from Kubernetes is forwarded correctly to
# the Node process (PID 1 signal-handling issue), which our graceful
# shutdown logic in server.js relies on.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user for security.
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

# uploads/ is used by later modules (CSV import) — create it with
# correct ownership now so it exists regardless of build order.
RUN mkdir -p uploads && chown -R nodeusr:nodegrp /app

USER nodeusr

EXPOSE 5000

# Kubernetes uses GET /health for liveness/readiness, so a Docker
# HEALTHCHECK is optional but useful for local `docker run` / compose.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
