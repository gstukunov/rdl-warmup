# RDL Warmup Bot - Agent Guide

> **Quick Start**: This is a Telegram bot + REST API for managing BP (British Parliamentary) debate games. It handles game creation, player registration, room allocation, scoring, and judge feedback.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [Key Concepts](#key-concepts)
5. [Working with the Code](#working-with-the-code)
6. [Common Tasks](#common-tasks)
7. [Technology Stack](#technology-stack)
8. [Environment Variables](#environment-variables)
9. [Telegram Mini App](#telegram-mini-app)

---

## Architecture Overview

This project has been refactored through 4 architectural phases. All phases coexist:

### Phase 1: Service Decomposition ✅
- Monolithic services broken into focused ones
- Repository pattern with interfaces
- User module extracted from Telegram module

### Phase 2: Database Normalization ✅
- JSONB `settings` migrated to proper columns
- New relational tables: `room_allocations`, `room_participants`, `room_judges`
- `max_participants`, `created_by_telegram_id`, `is_allocated` now proper columns

### Phase 3: Clean Architecture ✅
- **Domain Layer**: Entities, Value Objects, Events
- **Application Layer**: Commands, Queries, DTOs
- **Infrastructure Layer**: TypeORM implementations
- **Presentation Layer**: Controllers

### Phase 4: Event-Driven Architecture ✅
- Domain events: `GameCreated`, `GameStarted`, `GameCompleted`, etc.
- Event bus (in-memory, replaceable with Redis/RabbitMQ)
- Event handlers for async processing
- Event store for persistence

### Phase 5: Telegram Mini App ✅
- React-based SPA served from NestJS backend
- Telegram SDK integration for native UI
- Secure authentication via Telegram `initData`
- Mobile-first responsive design
- **See detailed docs: [./WEBAPP.md](./WEBAPP.md)**

### Current Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer                                          │
│  - Controllers (REST API)                                    │
│  - Telegram handlers                                         │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Application Layer                                           │
│  - Commands (CreateGame, RegisterUser, etc.)                 │
│  - Queries (GetGameById, GetOpenGames, etc.)                 │
│  - Event Handlers                                            │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Domain Layer                                                │
│  - Entities (Game, User) with business rules                 │
│  - Value Objects (Score, Position, TelegramId, etc.)         │
│  - Domain Events                                             │
│  - Repository Interfaces                                     │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Infrastructure Layer                                        │
│  - TypeORM Repositories (implement domain interfaces)        │
│  - Mappers (Domain ↔ TypeORM)                                │
│  - Event Bus (InMemory)                                      │
│  - Event Store                                               │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Database (PostgreSQL)                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── domain/                           # Domain Layer (no deps)
│   ├── entities/
│   │   ├── user.entity.ts           # Pure domain entity
│   │   └── game.entity.ts           # Business rules
│   ├── value-objects/
│   │   ├── score.vo.ts              # Score validation
│   │   ├── position.vo.ts           # OG, OO, CG, CO
│   │   ├── user-id.vo.ts
│   │   ├── game-id.vo.ts
│   │   └── telegram-id.vo.ts
│   ├── events/                      # Domain events
│   │   ├── domain-event.ts
│   │   ├── game-created.event.ts
│   │   ├── game-started.event.ts
│   │   ├── game-completed.event.ts
│   │   └── ...
│   └── repository-interfaces/
│       ├── user.repository.ts       # IUserRepository
│       └── game.repository.ts       # IGameRepository
│
├── application/                      # Application Layer
│   ├── commands/                    # Write operations
│   │   ├── create-game.command.ts
│   │   ├── create-game-with-events.command.ts
│   │   ├── register-user.command.ts
│   │   └── complete-game-with-events.command.ts
│   ├── queries/                     # Read operations
│   │   ├── get-game-by-id.query.ts
│   │   └── get-open-games.query.ts
│   ├── event-handlers/              # Async event handlers
│   │   ├── notify-game-started.handler.ts
│   │   └── update-user-stats.handler.ts
│   ├── dtos/                        # API response DTOs
│   │   ├── game.dto.ts
│   │   └── user.dto.ts
│   └── ports/
│       └── event-bus.port.ts        # IEventBus interface
│
├── infrastructure/                   # Infrastructure Layer
│   ├── database/
│   │   ├── mappers/                 # Domain ↔ TypeORM
│   │   │   ├── user.mapper.ts
│   │   │   └── game.mapper.ts
│   │   └── repositories/            # Implementations
│   │       ├── user.repository.impl.ts
│   │       └── game.repository.impl.ts
│   └── event-bus/
│       ├── in-memory-event-bus.ts
│       ├── event-store.impl.ts
│       └── event.entity.ts
│
├── presentation/                     # Presentation Layer
│   └── controllers/
│       └── clean-game.controller.ts # /games-v2 endpoints
│
├── user/                            # Legacy module (still working)
│   ├── entities/user.entity.ts      # TypeORM entity
│   ├── services/user.service.ts
│   └── repositories/
│
├── game/                            # Legacy module (still working)
│   ├── entities/                    # TypeORM entities
│   ├── services/                    # Decomposed services
│   ├── repositories/                # Old repositories
│   └── game.controller.ts           # Original REST API
│
├── telegram/                        # Telegram Bot module
│   └── telegram.service.ts          # Bot handlers
│
├── webapp/                          # Telegram Mini App API
│   ├── webapp.controller.ts         # REST endpoints
│   ├── webapp.service.ts            # Business logic
│   ├── webapp.module.ts             # Module definition
│   ├── guards/
│   │   └── webapp-auth.guard.ts     # Telegram auth validation
│   └── dtos/
│       └── webapp.dto.ts            # API DTOs
│
├── database/migrations/             # TypeORM migrations
├── config/                          # Configuration
│   ├── configuration.ts
│   └── swagger.config.ts
│
├── app.module.ts                    # Root module
├── clean-architecture.module.ts     # Phase 3 module
├── event-driven.module.ts           # Phase 4 module
└── main.ts                          # Entry point
```

---

## Database Schema

### Core Tables

```sql
-- Users (debate participants)
users
  - id: uuid (PK)
  - telegram_id: bigint (unique, indexed)
  - username: varchar
  - first_name: varchar
  - last_name: varchar
  - is_active: boolean
  - games_played: int
  - speaker_scores: jsonb (deprecated - kept for compat)
  - total_points: int
  - preferences: jsonb
  - created_at, updated_at: timestamp

-- Games (debate sessions)
games
  - id: uuid (PK)
  - name: varchar
  - description: text
  - status: enum (registration|allocating|in_progress|completed|cancelled)
  - max_participants: int (NEW - normalized from settings)
  - created_by_telegram_id: bigint (NEW - normalized from settings)
  - is_allocated: boolean (NEW - normalized from settings)
  - motion: text
  - start_time, end_time: timestamp
  - total_rounds, current_round: int
  - settings: jsonb (legacy - kept for transition)
  - created_at, updated_at: timestamp

-- Game Participants (players, judges, wings)
game_participants
  - id: uuid (PK)
  - game_id: uuid (FK)
  - user_id: uuid (FK, nullable)
  - telegram_id: bigint
  - username, first_name: varchar
  - role: enum (player|judge|wing)
  - position: enum (opening_government|opening_opposition|...)
  - team_name: varchar
  - is_registered: boolean
  - metadata: jsonb
  - registered_at: timestamp

-- Speaker Scores (individual scores per position)
speaker_scores
  - id: uuid (PK)
  - game_id: uuid (FK)
  - telegram_id: bigint
  - position: varchar
  - score: int
  - is_ironman: boolean
  - judge_telegram_id: bigint
  - submitted_at: timestamp

-- Judge Feedback (ratings for judges)
judge_feedback
  - id: uuid (PK)
  - game_id: uuid (FK)
  - player_telegram_id: bigint
  - judge_telegram_id: bigint
  - score: int (1-7)
  - feedback: text
  - submitted_at: timestamp

-- Room Allocations (NEW - normalized)
room_allocations
  - id: uuid (PK)
  - game_id: uuid (FK)
  - room_number: smallint
  - created_at: timestamp

-- Room Participants (NEW - position assignments)
room_participants
  - id: uuid (PK)
  - room_id: uuid (FK)
  - participant_id: uuid (FK)
  - position: enum (OG|OO|CG|CO)
  - is_ironman: boolean

-- Room Judges (NEW - judge assignments)
room_judges
  - id: uuid (PK)
  - room_id: uuid (FK)
  - participant_id: uuid (FK)
  - role: enum (chair|wing)

-- Domain Events (NEW - event sourcing)
domain_events
  - event_id: varchar (PK)
  - event_type: varchar (indexed)
  - aggregate_id: uuid (indexed)
  - occurred_at: timestamp (indexed)
  - version: int
  - payload: jsonb
  - sequence_number: bigint (unique, indexed)

-- Migrations tracking
migrations
  - id: int (PK)
  - timestamp: bigint
  - name: varchar
```

---

## Key Concepts

### Game Lifecycle

```
REGISTRATION → ALLOCATING → IN_PROGRESS → COMPLETED
      ↓
  CANCELLED
```

1. **REGISTRATION**: Players/judges register for the game
2. **ALLOCATING**: Players are assigned to positions (OG, OO, CG, CO)
3. **IN_PROGRESS**: Motion is set, debate begins
4. **COMPLETED**: Scores submitted, stats updated
5. **CANCELLED**: Can cancel during registration/allocating

### BP Debate Positions

- **OG** (Opening Government): First proposition team
- **OO** (Opening Opposition): First opposition team
- **CG** (Closing Government): Second proposition team
- **CO** (Closing Opposition): Second opposition team

### Ironman

When a player has to cover 2 positions (happens with odd player counts).

### Roles

- **PLAYER**: Debate participant
- **JUDGE**: Can submit scores, set motion
- **WING**: Assistant judge (cannot submit scores)

---

## Working with the Code

### Adding a New Feature

1. **If it involves business rules** → Add to Domain Layer:
   ```typescript
   // domain/entities/game.entity.ts
   class Game {
     newMethod(): void {
       // Business rule
     }
   }
   ```

2. **If it's a use case** → Add to Application Layer:
   ```typescript
   // application/commands/my-command.ts
   @Injectable()
   export class MyCommand {
     constructor(
       @Inject(GAME_REPOSITORY) private repo: IGameRepository
     ) {}
     
     async execute(data: MyData): Promise<Result> {
       // Implementation
     }
   }
   ```

3. **If it reacts to events** → Add Event Handler:
   ```typescript
   // application/event-handlers/my-handler.ts
   @Injectable()
   export class MyHandler {
     constructor(@Inject(EVENT_BUS) bus: IEventBus) {
       bus.subscribe('game.started', (e) => this.handle(e));
     }
   }
   ```

### Using the Event Bus

```typescript
// Publishing events
@Inject(EVENT_BUS) private eventBus: IEventBus;

async someMethod() {
  const game = Game.create({...});
  await this.gameRepository.save(game);
  
  // Emit event
  await this.eventBus.publish(new GameCreatedEvent(game, creatorId));
}
```

### Creating a Migration

```bash
# Generate (if DB is running)
npm run migration:generate --name=MyMigration

# Or create manually in src/database/migrations/
# Format: {timestamp}-MyMigration.ts

# Run migrations
npm run migration:run

# Check status
npm run migration:show
```

---

## Common Tasks

### Run the Application

```bash
# Start infrastructure (Postgres, Redis)
npm run docker:dev

# Run migrations
npm run migration:run

# Start dev server
npm run start:dev

# Or production build
npm run build
npm run start:prod
```

### Database Operations

```bash
# Access Postgres CLI
npm run docker:psql

# Reset database (revert + run)
npm run db:reset

# Seed data
npm run db:seed
```

### Testing Changes

```bash
# Build check
npm run build

# Type check only
npx tsc --noEmit
```

### API Endpoints

**Legacy API** (original):
- `GET /games` - List open games
- `POST /games` - Create game
- `POST /games/:id/register` - Register for game
- `POST /games/:id/allocate` - Allocate positions
- `POST /games/:id/motion` - Set motion
- `POST /games/:id/scores` - Submit scores

**Clean Architecture API** (new):
- `GET /games-v2` - List open games
- `GET /games-v2/:id` - Get game by ID
- `POST /games-v2` - Create game

**WebApp API** (Mini App - requires Telegram auth):
- `GET /webapp/config` - Get bot config
- `GET /webapp/games` - List open games
- `GET /webapp/games/:id` - Get game details
- `GET /webapp/games/my` - Get user's active game
- `POST /webapp/games/:id/join` - Join a game
- `POST /webapp/games/:id/leave` - Leave a game
- `GET /webapp/profile` - Get user profile
- `GET /webapp/profile/judge-stats` - Get judge stats

**Stats API** (Public - no auth required):
- `GET /stats` - Get public speaker and judge statistics

**Admin API** (requires admin password):
- `POST /admin/login` - Login with admin password
- `GET /admin/users` - Get all users (for speaker/judge selection)
- `GET /admin/games/completed` - Get games ready for results
- `GET /admin/games/:id/details` - Get game details for admin
- `POST /admin/games/results` - Submit game results with scores

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 15 |
| ORM | TypeORM 0.3 |
| Cache | Redis (ioredis) |
| Bot Framework | Telegraf |
| API Docs | Swagger/OpenAPI |
| Validation | class-validator |
| **Mini App** | **React 18 + Vite** |
| Mini App SDK | @telegram-apps/sdk |
| Styling | CSS Variables (Telegram Theme) |

---

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=telegram_user
DB_PASSWORD=telegram_password
DB_NAME=telegram_bot_db
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBAPP_URL=https://your-webapp.com

# WebApp (NEW)
WEBAPP_DEV_URL=http://localhost:5173

# Game
GAME_PASSWORD=secret_password_for_creating_games

# Admin
ADMIN_PASSWORD=your_secure_admin_password_for_results
```

---

## Important Notes

### Backward Compatibility

- All 4 architecture phases coexist
- Original `/games` endpoints still work
- New `/games-v2` uses Clean Architecture
- JSONB `settings` still exists but is deprecated

### Repository Pattern

Always inject repositories by their interface token:

```typescript
constructor(
  @Inject(GAME_REPOSITORY) private repo: IGameRepository,
) {}
```

Not by class:
```typescript
// DON'T DO THIS
constructor(private repo: GameRepository) {} // ❌
```

### Events vs Direct Calls

- Use **events** for async operations (notifications, stats updates)
- Use **direct calls** for synchronous operations (validation, immediate responses)

### Transaction Boundaries

Commands should be atomic. If you need transactions across multiple aggregates, consider using a Saga pattern or Unit of Work.

---

## Troubleshooting

### Migration fails

```bash
# Check DB is running
docker-compose ps

# Check migration status
npm run migration:show

# Revert last migration
npm run migration:revert
```

### TypeScript errors

```bash
# Check isolatedModules issues
npx tsc --noEmit

# Common fix: use 'import type' for interfaces
import type { IGameRepository } from '...';
import { GAME_REPOSITORY } from '...';
```

### Event handlers not firing

- Check handler is registered in module providers
- Check handler subscribes in constructor
- Check event type string matches

---

## Quick Reference

| Task | Command |
|------|---------|
| Create migration | `npm run migration:generate --name=X` |
| Run migrations | `npm run migration:run` |
| Start dev | `npm run start:dev` |
| Build | `npm run build` |
| Build server only | `npm run build:server` |
| WebApp dev | `npm run webapp:dev` |
| WebApp build | `npm run webapp:build` |
| DB CLI | `npm run docker:psql` |
| Redis CLI | `npm run docker:redis` |

---

## Telegram Mini App

The project now includes a **Telegram Mini App** - a React-based SPA that users can open directly from the Telegram bot.

### Quick Start

```bash
# Install webapp dependencies
npm run webapp:install

# Build webapp for production
npm run webapp:build

# Dev mode (with hot reload on http://localhost:5173)
npm run webapp:dev
```

### Architecture

```
webapp/                              # React frontend
├── src/
│   ├── api/                         # API clients
│   │   ├── client.ts                # Axios client with auth
│   │   ├── games.ts                 # Games API
│   │   └── user.ts                  # User API
│   ├── components/                  # Reusable components
│   │   ├── Layout.tsx               # Page layout
│   │   ├── Card.tsx                 # Card component
│   │   ├── Button.tsx               # Button component
│   │   └── GameStatus.tsx           # Status badge
│   ├── hooks/                       # Custom hooks
│   │   └── useTelegram.ts           # Telegram SDK hook
│   ├── pages/                       # Page components
│   │   ├── GamesList.tsx            # Games list page
│   │   ├── GameDetails.tsx          # Game details page
│   │   └── Profile.tsx              # User profile page
│   ├── types/                       # TypeScript types
│   │   └── index.ts
│   ├── App.tsx                      # Main app component
│   └── main.tsx                     # Entry point
├── index.html
├── vite.config.ts
└── package.json

public/webapp/                       # Build output (served by NestJS)
├── index.html
└── assets/
    └── ...
```

### Features

- **Games List**: View open games and user's active game
- **Game Details**: See game info, participants, join/leave
- **Profile**: View user stats and judge ratings
- **Telegram Integration**: Native back button, main button, haptic feedback
- **Theme Support**: Automatically adapts to Telegram's color scheme

### Authentication

The Mini App uses Telegram's built-in authentication:
1. User opens app from Telegram bot
2. Frontend receives `initData` from Telegram SDK
3. Frontend sends `X-Telegram-Init-Data` header with each request
4. Backend validates the hash using bot token
5. User identity extracted from initData

### Environment Variables

```bash
# Required for Mini App
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBAPP_URL=https://your-domain.com/webapp

# Dev mode
WEBAPP_DEV_URL=http://localhost:5173
```

### Pages

| Route | Description |
|-------|-------------|
| `/` | Games list - shows open games and user's active game |
| `/games/:id` | Game details - join/leave, see participants |
| `/profile` | User profile - stats, ratings |

### API Endpoints

All endpoints are prefixed with `/webapp` and require Telegram authentication:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webapp/config` | Get bot config |
| GET | `/webapp/games` | List open games |
| GET | `/webapp/games/:id` | Get game details |
| GET | `/webapp/games/my` | Get user's active game |
| POST | `/webapp/games/:id/join` | Join a game |
| POST | `/webapp/games/:id/leave` | Leave a game |
| GET | `/webapp/profile` | Get user profile |
| GET | `/webapp/profile/judge-stats` | Get judge stats |

### Development Mode

In development mode, the API client uses mock initData:
```typescript
// Mock user for dev
{
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser'
}
```

### Production Deployment

#### Using Docker Compose (Recommended)

See detailed server setup guide: **[../SERVER_SETUP.md](../SERVER_SETUP.md)**

Quick deployment:
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your values

# 2. Deploy
./deploy.sh
```

#### Manual Build

1. Build the webapp: `npm run webapp:build`
2. Build the server: `npm run build:server`
3. Static files are served from `public/webapp/`
4. Ensure `TELEGRAM_WEBAPP_URL` points to your domain + `/webapp`

### GitHub Actions CI/CD

The repository includes automated CI/CD:
- On push to `main`/`master`, Docker image is built and pushed to GHCR
- Watchtower on the server auto-updates within 60 seconds
- See `.github/workflows/deploy.yml`

### Bot Integration

The bot automatically sets up the Mini App menu button:
- Menu button appears in Telegram chat
- `/webapp` command opens the Mini App
- "📱 Open App" button in main menu

---

*Last updated: April 2026*
*Architecture: 5-phase refactor complete (including Mini App)*
