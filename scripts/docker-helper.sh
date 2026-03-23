#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Docker Helper for Telegram Bot${NC}\n"

case "$1" in
  start)
    echo -e "${YELLOW}Starting all services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✓ Services started${NC}"
    echo -e "📊 App: http://localhost:3000"
    echo -e "📚 Swagger: http://localhost:3000/api/docs"
    echo -e "🐘 PostgreSQL: localhost:5432 (connect with DBeaver)"
    echo -e "📦 Redis: localhost:6379"
    ;;
    
  stop)
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
    ;;
    
  restart)
    echo -e "${YELLOW}Restarting all services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ Services restarted${NC}"
    ;;
    
  logs)
    echo -e "${YELLOW}Showing logs...${NC}"
    docker-compose logs -f ${2:-}
    ;;
    
  shell)
    echo -e "${YELLOW}Opening shell in app container...${NC}"
    docker-compose exec app sh
    ;;
    
  psql)
    echo -e "${YELLOW}Connecting to PostgreSQL...${NC}"
    docker-compose exec postgres psql -U ${DB_USER:-telegram_user} -d ${DB_NAME:-telegram_bot_db}
    ;;
    
  redis)
    echo -e "${YELLOW}Connecting to Redis...${NC}"
    docker-compose exec redis redis-cli
    ;;
    
  migrate)
    echo -e "${YELLOW}Running migrations...${NC}"
    docker-compose --profile migrations up migrations
    echo -e "${GREEN}✓ Migrations completed${NC}"
    ;;
    
  clean)
    echo -e "${RED}⚠️  This will remove all containers, volumes, and data!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      echo -e "${GREEN}✓ Cleanup complete${NC}"
    else
      echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;
    
  build)
    echo -e "${YELLOW}Rebuilding app container...${NC}"
    docker-compose build app
    echo -e "${GREEN}✓ Build complete${NC}"
    ;;
    
  *)
    echo "Usage: ./scripts/docker-helper.sh {start|stop|restart|logs|shell|psql|redis|migrate|clean|build}"
    echo ""
    echo "Commands:"
    echo "  start    - Start all services"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  logs     - Show logs (optional: service name)"
    echo "  shell    - Open shell in app container"
    echo "  psql     - Connect to PostgreSQL"
    echo "  redis    - Connect to Redis"
    echo "  migrate  - Run database migrations"
    echo "  clean    - Remove all containers and volumes"
    echo "  build    - Rebuild app container"
    exit 1
    ;;
esac