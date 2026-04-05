# API - Base Architecture

> **Location**: `src/` folder (NestJS backend)  
> **Framework**: NestJS 11 + TypeScript  
> **Architecture**: Clean Architecture + Event-Driven  

---

## Architecture Overview

The backend follows **Clean Architecture** with **Event-Driven** patterns. Code is organized in layers with clear dependencies pointing inward.

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  - Controllers (HTTP handlers)                              │
│  - DTOs (Data Transfer Objects)                             │
│  - Guards (Auth)                                            │
│  - No business logic here!                                  │
│  Location: src/presentation/, src/webapp/, src/game/        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Depends on
┌──────────────────────────────▼──────────────────────────────┐
│  APPLICATION LAYER                                           │
│  - Commands (write operations)                              │
│  - Queries (read operations)                                │
│  - Event Handlers                                           │
│  - Orchestrates use cases                                   │
│  Location: src/application/                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ Depends on
┌──────────────────────────────▼──────────────────────────────┐
│  DOMAIN LAYER                                                │
│  - Entities (business logic)                                │
│  - Value Objects                                            │
│  - Domain Events                                            │
│  - Repository Interfaces                                    │
│  - No external dependencies!                                │
│  Location: src/domain/                                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Depends on
┌──────────────────────────────▼──────────────────────────────┐
│  INFRASTRUCTURE LAYER                                        │
│  - TypeORM Repositories                                     │
│  - Database Mappers                                         │
│  - Event Bus                                                │
│  - External services                                        │
│  Location: src/infrastructure/                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── main.ts                          # Entry point
├── app.module.ts                    # Root module
├── app.controller.ts                # Root controller
├── app.service.ts                   # Root service
│
├── config/                          # Configuration
│   ├── configuration.ts             # Env config
│   └── swagger.config.ts            # Swagger setup
│
├── database/
│   └── migrations/                  # TypeORM migrations
│
├── domain/                          # DOMAIN LAYER
│   ├── entities/
│   │   ├── game.entity.ts          # Game domain entity
│   │   └── user.entity.ts          # User domain entity
│   ├── value-objects/
│   │   ├── score.vo.ts             # Score value object
│   │   ├── position.vo.ts          # BP position (OG, OO, CG, CO)
│   │   ├── user-id.vo.ts           # User ID VO
│   │   └── telegram-id.vo.ts       # Telegram ID VO
│   ├── events/
│   │   ├── domain-event.ts         # Base event class
│   │   ├── game-created.event.ts
│   │   ├── game-started.event.ts
│   │   └── game-completed.event.ts
│   └── repository-interfaces/
│       ├── user.repository.ts      # IUserRepository interface
│       └── game.repository.ts      # IGameRepository interface
│
├── application/                     # APPLICATION LAYER
│   ├── commands/                    # Write operations
│   │   ├── create-game.command.ts
│   │   ├── register-user.command.ts
│   │   └── complete-game-with-events.command.ts
│   ├── queries/                     # Read operations
│   │   ├── get-game-by-id.query.ts
│   │   └── get-open-games.query.ts
│   ├── event-handlers/              # Async event handlers
│   │   ├── notify-game-started.handler.ts
│   │   └── update-user-stats.handler.ts
│   ├── dtos/                        # API DTOs
│   │   ├── game.dto.ts
│   │   └── user.dto.ts
│   └── ports/
│       └── event-bus.port.ts        # IEventBus interface
│
├── infrastructure/                  # INFRASTRUCTURE LAYER
│   ├── database/
│   │   ├── mappers/                 # Domain ↔ TypeORM
│   │   │   ├── user.mapper.ts
│   │   │   └── game.mapper.ts
│   │   └── repositories/            # Repository implementations
│   │       ├── user.repository.impl.ts
│   │       └── game.repository.impl.ts
│   └── event-bus/
│       ├── in-memory-event-bus.ts
│       ├── event-store.impl.ts
│       └── event.entity.ts
│
├── presentation/                    # PRESENTATION LAYER (Clean Arch)
│   └── controllers/
│       └── clean-game.controller.ts # /games-v2 endpoints
│
├── webapp/                          # WebApp API (Mini App)
│   ├── webapp.controller.ts         # REST endpoints
│   ├── webapp.service.ts            # Business logic
│   ├── webapp.module.ts             # Module definition
│   ├── guards/
│   │   └── webapp-auth.guard.ts     # Telegram auth validation
│   └── dtos/
│       └── webapp.dto.ts            # API DTOs
│
├── telegram/                        # Telegram Bot
│   └── telegram.service.ts          # Bot handlers
│
├── game/                            # LEGACY: Game module
├── user/                            # LEGACY: User module
├── clean-architecture.module.ts     # Phase 3 module
└── event-driven.module.ts           # Phase 4 module
```

---

## Layer Rules

### Domain Layer
- **No dependencies** on other layers
- Pure TypeScript, no frameworks
- Contains business rules
- Repository interfaces (not implementations)

```typescript
// domain/entities/game.entity.ts
export class Game {
  constructor(private readonly props: GameProps) {}

  start(): void {
    if (this.props.status !== GameStatus.ALLOCATING) {
      throw new Error('Can only start from ALLOCATING');
    }
    this.props.status = GameStatus.IN_PROGRESS;
  }
}
```

### Application Layer
- Depends on **Domain layer**
- Orchestrates use cases
- No framework-specific code (except decorators)

```typescript
// application/commands/create-game.command.ts
@Injectable()
export class CreateGameCommand {
  constructor(
    @Inject(GAME_REPOSITORY) private repo: IGameRepository,
    @Inject(EVENT_BUS) private eventBus: IEventBus,
  ) {}

  async execute(data: CreateGameData): Promise<Game> {
    const game = Game.create(data);
    await this.repo.save(game);
    await this.eventBus.publish(new GameCreatedEvent(game));
    return game;
  }
}
```

### Infrastructure Layer
- Depends on **Domain** and **Application**
- Contains implementations
- Framework-specific code here

```typescript
// infrastructure/database/repositories/game.repository.impl.ts
@Injectable()
export class GameRepositoryImpl implements IGameRepository {
  constructor(
    @InjectRepository(GameOrmEntity)
    private ormRepo: Repository<GameOrmEntity>,
    private mapper: GameMapper,
  ) {}

  async save(game: Game): Promise<void> {
    const ormEntity = this.mapper.toOrm(game);
    await this.ormRepo.save(ormEntity);
  }
}
```

### Presentation Layer
- Depends on **Application** layer
- HTTP handling only
- DTOs for input validation

```typescript
// presentation/controllers/clean-game.controller.ts
@Controller('games-v2')
export class CleanGameController {
  constructor(private createGame: CreateGameCommand) {}

  @Post()
  async create(@Body() dto: CreateGameDto) {
    return this.createGame.execute(dto);
  }
}
```

---

## Dependency Injection

Use NestJS DI with injection tokens:

```typescript
// Constants for injection tokens
export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');
export const EVENT_BUS = Symbol('EVENT_BUS');

// Provider registration
@Module({
  providers: [
    {
      provide: GAME_REPOSITORY,
      useClass: GameRepositoryImpl,
    },
    {
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },
  ],
})
```

---

## Domain Events

Events decouple business operations:

```typescript
// domain/events/game-created.event.ts
export class GameCreatedEvent implements DomainEvent {
  readonly occurredAt = new Date();
  
  constructor(
    public readonly game: Game,
    public readonly creatorId: string,
  ) {}
}

// application/event-handlers/notify-game-started.handler.ts
@Injectable()
export class NotifyGameStartedHandler {
  constructor(@Inject(EVENT_BUS) bus: IEventBus) {
    bus.subscribe('game.started', (e) => this.handle(e));
  }

  async handle(event: GameStartedEvent) {
    // Send notifications
  }
}
```

---

## Repository Pattern

Always use interface, not implementation:

```typescript
// ✅ Correct - inject interface
constructor(
  @Inject(GAME_REPOSITORY) private repo: IGameRepository,
) {}

// ❌ Wrong - inject implementation
constructor(private repo: GameRepositoryImpl) {}
```

---

## API Modules

### WebApp Module (Mini App)
- Location: `src/webapp/`
- Endpoints: `/webapp/*`
- Auth: Telegram initData validation

### Telegram Module (Bot)
- Location: `src/telegram/`
- Handles bot commands and messages

### Stats Module (Public)
- Endpoint: `GET /stats`
- No authentication required

### Admin Module
- Endpoints: `/admin/*`
- Auth: Bearer token from `/admin/login`

---

## Database

### TypeORM Entities

```typescript
@Entity('games')
export class GameOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('enum', { enum: GameStatus })
  status: GameStatus;
}
```

### Migrations

```bash
# Generate migration
npm run migration:generate --name=AddUserTable

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## Authentication

### Telegram WebApp Auth

1. Frontend sends `X-Telegram-Init-Data` header
2. `WebAppAuthGuard` validates the hash
3. User extracted from initData

### Admin Auth

1. POST `/admin/login` with password
2. Returns JWT token
3. Send as `Authorization: Bearer <token>`

---

## Best Practices

1. **Domain first** - Business logic in entities
2. **Interfaces** - Always inject interfaces
3. **Immutability** - Value objects are immutable
4. **Events** - Use for side effects
5. **DTOs** - Validate at boundary
6. **Mappers** - Separate domain from ORM
7. **Transactions** - Commands should be atomic

---

## Legacy Code

Old modules still exist in:
- `src/game/` - Legacy game module
- `src/user/` - Legacy user module

Prefer Clean Architecture for new features.

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

## See Also

- `ADDING_ENTITIES.md` - How to add entities
- `../webapp/BASE.md` - Frontend architecture
- `../OVERVIEW.md` - System overview
