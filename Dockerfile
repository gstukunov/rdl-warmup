# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root package files
COPY package*.json ./

# Copy webapp package files
COPY webapp/package*.json ./webapp/

# Install root dependencies
RUN npm ci

# Install webapp dependencies
RUN cd webapp && npm ci

# Copy source code (including webapp)
COPY . .

# Build webapp
RUN cd webapp && npm run build:prod

# Build the NestJS server
RUN npm run build:server

# Production stage
FROM node:20-alpine AS production

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

# Copy built webapp static files
COPY --from=builder /usr/src/app/public/webapp ./public/webapp

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose application port
EXPOSE 3000

# Start in production mode with migrations
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
