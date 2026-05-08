# ---- Base Node ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS dependencies
# Copy only package files to leverage Docker layer caching
COPY package.json package-lock.json ./
# Install only production dependencies
RUN npm ci --only=production

# ---- Release ----
FROM base AS release

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Ensure we're running as a non-root user
USER node

# Expose port (can be overridden by environment variable, defaults to 3000)
EXPOSE 3000

# Healthcheck to verify the server is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { if (res.statusCode !== 200) process.exit(1); process.exit(0); })"

# Start the server
CMD ["node", "server.js"]
