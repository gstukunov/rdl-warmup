# RDL Warmup Bot - Agent Context

## Quick Links

- 📖 **Full Documentation**: [./agents/AGENTS.md](./agents/AGENTS.md)
- 🏗️ **Architecture**: 4-phase refactor (Services → Database → Clean Arch → Events)
- 💻 **Tech Stack**: NestJS + TypeScript + PostgreSQL + TypeORM + Redis

## TL;DR

This is a **Telegram bot + REST API** for managing BP (British Parliamentary) debate games.

```bash
# Quick start
docker-compose up -d
npm run migration:run
npm run start:dev
```

## Key Architecture Decisions

1. **Repository Pattern**: All repositories accessed via interface tokens (`@Inject(GAME_REPOSITORY)`)
2. **Clean Architecture**: Domain → Application → Infrastructure → Presentation layers
3. **Event-Driven**: Domain events + event bus for async operations
4. **Backward Compatible**: All 4 phases coexist, old endpoints still work

## Important Patterns

### Dependency Injection
```typescript
// ✅ CORRECT - Use interface tokens
@Inject(GAME_REPOSITORY) private repo: IGameRepository

// ❌ WRONG - Don't use concrete classes
constructor(private repo: GameRepository) {}
```

### Domain Events
```typescript
// Publish events for side effects
await this.eventBus.publish(new GameCreatedEvent(game, creatorId));
```

### Type Imports
```typescript
// ✅ CORRECT - Separate type and value imports
import type { IGameRepository } from '...';
import { GAME_REPOSITORY } from '...';
```

## Database

- **11 tables** including new `domain_events` for event sourcing
- **11 migrations** applied
- New normalized columns: `max_participants`, `created_by_telegram_id`, `is_allocated`

## Module Structure

```
AppModule
├── UserModule (legacy)
├── GameModule (legacy)
├── TelegramModule
├── CleanArchitectureModule (Phase 3)
└── EventDrivenModule (Phase 4)
```

## See Full Guide

👉 **[agents/AGENTS.md](./agents/AGENTS.md)** for:
- Complete folder structure
- Database schema
- All API endpoints
- Working with the code
- Common tasks
- Troubleshooting
