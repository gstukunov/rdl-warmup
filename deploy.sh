#!/bin/bash

# Manual deployment script for VPS with Watchtower
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file first. See .env.example for reference."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin $(git rev-parse --abbrev-ref HEAD)

# Pull latest images from registry
echo -e "${YELLOW}🐳 Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.prod.yml pull app

# Run migrations if needed
echo -e "${YELLOW}🗄️ Running migrations...${NC}"
docker-compose -f docker-compose.prod.yml --profile migrations run --rm migrations || true

# Ensure all services are running
echo -e "${YELLOW}▶️ Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${BLUE}🔄 Watchtower will handle automatic updates every 60 seconds${NC}"
    echo -e "${GREEN}📱 App is running at: http://$(hostname -I | awk '{print $1}'):3000${NC}"
    echo -e "${GREEN}🤖 Telegram bot is active${NC}"
    echo ""
    echo -e "${BLUE}📋 Useful commands:${NC}"
    echo -e "  ${YELLOW}View app logs:${NC} docker-compose -f docker-compose.prod.yml logs -f app"
    echo -e "  ${YELLOW}View watchtower logs:${NC} docker-compose -f docker-compose.prod.yml logs -f watchtower"
    echo -e "  ${YELLOW}Check status:${NC} docker-compose -f docker-compose.prod.yml ps"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo -e "${RED}Check logs with: docker-compose -f docker-compose.prod.yml logs${NC}"
    exit 1
fi

# Clean up old images
echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f

echo -e "${GREEN}🎉 Deployment complete!${NC}"
