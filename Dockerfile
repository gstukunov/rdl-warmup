# Build stage
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Install system dependencies for bcrypt and other native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    netcat-openbsd

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for tsconfig-paths and migrations)
RUN npm ci

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose application port
EXPOSE 3000

# Start in production mode with migrations
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]