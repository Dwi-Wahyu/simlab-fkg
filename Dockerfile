# Stage 1: Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy dependency configuration files
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for building/migrating)
RUN bun install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the SvelteKit application (build output goes to build/ directory)
RUN bun run build

# Stage 2: Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json
COPY package.json ./

# Copy built files and production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

# Expose port 3000 for SvelteKit server
EXPOSE 3000

# Start SvelteKit standalone Node server
CMD ["node", "build/index.js"]
