FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY .npmrc ./

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install pnpm for build
RUN npm install -g pnpm@8.15.0

# Build TypeScript
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 orcauser

# Copy built application
COPY --from=builder --chown=orcauser:nodejs /app/dist ./dist
COPY --from=builder --chown=orcauser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=orcauser:nodejs /app/package.json ./
COPY --from=builder --chown=orcauser:nodejs /app/src ./src

USER orcauser

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
