# Autonomous Mesh OS - Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies for production
RUN apk add --no-cache \
    curl \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY *.mjs ./
COPY *.yaml ./
COPY *.yml ./
COPY *.json ./
COPY *.md ./

# Create necessary directories
RUN mkdir -p /var/log/mesh-os /var/audit /var/reports

# Set permissions
RUN chown -R node:node /app /var/log/mesh-os /var/audit /var/reports

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Default command
CMD ["node", "mesh_kernel.mjs"]
