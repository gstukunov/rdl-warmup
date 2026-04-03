# Server Setup Guide for RDL Warmup Bot with Mini App

This guide will help you set up the RDL Warmup Bot with Telegram Mini App on a VPS server.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Domain name (optional but recommended for HTTPS)
- GitHub account with Container Registry access
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 2. Create environment file
cp .env.example .env
# Edit .env with your values

# 3. Run deployment
./deploy.sh
```

## Detailed Setup

### 1. Server Preparation

#### Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

#### Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Repository Setup

```bash
# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin
```

### 3. Environment Configuration

Create `.env` file:

```bash
cp .env.example .env
nano .env
```

Fill in the required values:

```env
# Server
NODE_ENV=production
PORT=3000

# Database (use strong passwords)
DB_USER=telegram_user
DB_PASSWORD=your_secure_random_password
DB_NAME=telegram_bot_db

# Redis
REDIS_PASSWORD=your_secure_random_password

# Telegram (get from @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=your_bot_username

# IMPORTANT: This is the public URL for your Mini App
# If using domain: https://your-domain.com/webapp
# If using IP: http://your-server-ip:3000/webapp
TELEGRAM_WEBAPP_URL=https://your-domain.com/webapp

# Game password (for creating games)
GAME_PASSWORD=your_game_password

# Admin password (for submitting game results)
ADMIN_PASSWORD=your_secure_admin_password

# Docker image (for CI/CD)
IMAGE_NAME=ghcr.io/your-username/your-repo
```

### 4. First Deployment

```bash
# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

This will:
1. Pull the latest Docker image
2. Run database migrations
3. Start all services
4. Set up Watchtower for auto-updates

### 5. Configure Telegram Bot

1. Open [@BotFather](https://t.me/botfather)
2. Send `/mybots`
3. Select your bot
4. Go to **Bot Settings** → **Menu Button** → **Configure menu button**
5. Set button text: `Open App`
6. Set URL: Your `TELEGRAM_WEBAPP_URL` from `.env`

### 6. HTTPS Setup (Recommended)

#### Option A: Using Nginx with Let's Encrypt

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

Get SSL certificate:
```bash
docker run -it --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/www:/var/www/certbot \
  certbot/certbot certonly \
  --standalone \
  -d your-domain.com
```

Enable Nginx in docker-compose:
```bash
# Uncomment nginx service in docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d nginx
```

#### Option B: Using Cloudflare Tunnel (Easiest)

1. Install cloudflared:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

2. Authenticate:
```bash
cloudflared tunnel login
```

3. Create tunnel:
```bash
cloudflared tunnel create telegram-bot
```

4. Create config:
```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: your-tunnel-id
credentials-file: /home/your-user/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF
```

5. Run tunnel:
```bash
cloudflared tunnel run telegram-bot
```

Or as a service:
```bash
cloudflared service install
sudo systemctl start cloudflared
```

## Maintenance

### View Logs
```bash
# App logs
docker-compose -f docker-compose.prod.yml logs -f app

# Watchtower logs
docker-compose -f docker-compose.prod.yml logs -f watchtower

# All logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Manually
```bash
./deploy.sh
```

### Database Backup
```bash
# Backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U telegram_user telegram_bot_db > backup.sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U telegram_user telegram_bot_db < backup.sql
```

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml top
```

### Restart Services
```bash
# Restart app
docker-compose -f docker-compose.prod.yml restart app

# Restart all
docker-compose -f docker-compose.prod.yml restart
```

## Troubleshooting

### Container not starting
```bashndocker-compose -f docker-compose.prod.yml logs app
```

### Database connection issues
```bash
# Check if postgres is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### Mini App not loading
1. Check if `TELEGRAM_WEBAPP_URL` is correct
2. Verify static files are in the image:
   ```bash
   docker run --rm ghcr.io/your-username/your-repo:latest ls -la public/webapp/
   ```
3. Check app logs for errors

### Watchtower not updating
```bash
# Check watchtower logs
docker-compose -f docker-compose.prod.yml logs watchtower

# Ensure GHCR credentials are correct
cat ~/.docker/config.json
```

### Permission denied on deploy.sh
```bash
chmod +x deploy.sh
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Using strong passwords (16+ chars, random)
- [ ] Firewall configured (only 80/443 open)
- [ ] HTTPS enabled
- [ ] Database not exposed to internet
- [ ] Redis password set
- [ ] Regular backups configured
- [ ] Docker images from trusted sources only

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` | Yes |
| `PORT` | Internal port (3000) | Yes |
| `DB_USER` | PostgreSQL username | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `DB_NAME` | PostgreSQL database name | Yes |
| `REDIS_PASSWORD` | Redis password | Yes |
| `TELEGRAM_BOT_TOKEN` | From @BotFather | Yes |
| `TELEGRAM_BOT_USERNAME` | Bot username without @ | Yes |
| `TELEGRAM_WEBAPP_URL` | Public Mini App URL | Yes |
| `GAME_PASSWORD` | Password for creating games | Yes |
| `ADMIN_PASSWORD` | Password for admin results page | No |
| `IMAGE_NAME` | Docker image name | For CI/CD |

## Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Review documentation in `agents/WEBAPP.md`
3. Check GitHub Issues

---

*Last updated: April 2026*
