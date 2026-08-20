# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev replaces the deprecated --only=production
RUN npm ci --omit=dev && npm cache clean --force

# ---- Release ----
FROM node:22-alpine AS release
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# dumb-init reaps zombies and forwards SIGTERM to node for a clean shutdown
RUN apk add --no-cache dumb-init

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public ./public

USER node

EXPOSE 3000

# Honours $PORT instead of hard-coding 3000, and hits the cheap health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;require('http').get('http://127.0.0.1:'+p+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
