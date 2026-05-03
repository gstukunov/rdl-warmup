# RDL Warmup - System Overview

> **Project**: RDL Warmup Bot - Telegram Bot + Mini App for BP Debate Games
> **Last Updated**: May 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TELEGRAM CLIENT                                │
│  - User interacts with bot via messages                                  │
│  - Opens Mini App from bot menu/button                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ Bot Commands / WebApp
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                           NESTJS BACKEND (API)                          │
│  - Location: `src/`                                                      │
│  - Port: 3000                                                            │
│  - Responsibilities:                                                     │
│    • Telegram bot handlers                                               │
│    • REST API endpoints                                                  │
│    • WebApp API (with Telegram auth)                                     │
│    • Database operations                                                 │
│    - Business logic                                                      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ HTTP / SQL
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                        DATA LAYER                                       │
│  - PostgreSQL (game data, users, scores)                                │
│  - Redis (caching, sessions)                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
.agents/
├── OVERVIEW.md              # This file - system-wide overview
├── webapp/
│   ├── BASE.md             # Webapp architecture & concepts
│   └── ADDING_ENTITIES.md  # How to add entities to webapp
├── api/
│   ├── BASE.md             # API architecture & concepts
│   └── ADDING_ENTITIES.md  # How to add entities to API
└── WEBAPP.md               # (Legacy) Detailed webapp guide

src/                         # NestJS Backend (API)
├── main.ts                  # Entry point
├── app.module.ts            # Root module
├── telegram/                # Telegram bot handlers
├── webapp/                  # WebApp API controllers
├── game/                    # Game module (legacy)
├── user/                    # User module (legacy)
├── domain/                  # Clean Architecture - Domain
├── application/             # Clean Architecture - Application
├── infrastructure/          # Clean Architecture - Infrastructure
└── presentation/            # Clean Architecture - Presentation

webapp/                      # React Frontend
├── src/
│   ├── app/                 # App initialization
│   ├── pages/               # Page components
│   ├── widgets/             # Complex UI
│   ├── features/            # User interactions
│   ├── entities/            # Business entities
│   └── shared/              # Shared infrastructure
├── index.html
└── package.json

public/webapp/               # Built frontend (served by NestJS)
```

---

## Communication Flow

### 1. Telegram Bot Flow
```
User Message → Telegram API → NestJS (telegram/service.ts) → Database → Response
```

### 2. Mini App Flow
```
User opens Mini App
    ↓
Telegram provides initData (user info, auth)
    ↓
React App loads (webapp/)
    ↓
API calls with X-Telegram-Init-Data header
    ↓
NestJS validates initData (webapp/guards/)
    ↓
Business logic → Database → Response
```

> **Browser access**: The webapp also works in a regular browser without Telegram auth. Public stats endpoints (`/api/stats/*`) require no auth. Mini-app endpoints (`/api/webapp/*`) allow anonymous requests but protect user-specific actions (join/leave game, profile) with optional Telegram auth.


### 3. Public Stats Flow
```
User visits /stats or opens webapp in browser
    ↓
No auth required for public stats
    ↓
NestJS serves webapp
    ↓
React App calls GET /stats, GET /stats/games, GET /stats/motions
    ↓
Public endpoints return data
```

---

## Key Concepts

### BP Debate Positions
- **OG** (Opening Government) - First proposition
- **OO** (Opening Opposition) - First opposition
- **CG** (Closing Government) - Second proposition
- **CO** (Closing Opposition) - Second opposition

### Game Lifecycle
```
REGISTRATION → ALLOCATING → IN_PROGRESS → COMPLETED
      ↓
  CANCELLED
```

### Roles
- **PLAYER** - Debate participant
- **JUDGE** - Can submit scores
- **WING** - Assistant judge (cannot submit)

### Ironman
When a player covers 2 positions (happens with odd player counts).

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11 |
| **Frontend** | React 18 + Vite |
| **UI Library** | shadcn/ui + Tailwind CSS |
| **Database** | PostgreSQL 15 |
| **ORM** | TypeORM 0.3 |
| **Cache** | Redis |
| **Bot** | Telegraf |
| **State Management** | TanStack Query |
| **Styling** | Tailwind CSS + CSS Variables |

---

## Quick Start

### Development
```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Run migrations
npm run migration:run

# 3. Start backend
npm run start:dev

# 4. Start frontend (new terminal)
npm run webapp:dev
```

### Production Build
```bash
# Build everything
npm run build

# Or separately:
npm run webapp:build    # Frontend
npm run build:server    # Backend
```

---

## Documentation Guide

| File | Purpose |
|------|---------|
| `OVERVIEW.md` | System-wide overview (this file) |
| `webapp/BASE.md` | Webapp architecture & patterns |
| `webapp/ADDING_ENTITIES.md` | Adding entities to frontend |
| `api/BASE.md` | API architecture & patterns |
| `api/ADDING_ENTITIES.md` | Adding entities to backend |

---

## Environment Variables

See `.env.example` for full list. Key variables:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_BOT_USERNAME=xxx
TELEGRAM_WEBAPP_URL=https://your-domain.com/webapp

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=xxx
DB_PASSWORD=xxx
DB_NAME=xxx

# Admin
ADMIN_PASSWORD=xxx

# Game
GAME_PASSWORD=xxx
```

---

*For detailed architecture, see respective BASE.md files in subfolders.*
