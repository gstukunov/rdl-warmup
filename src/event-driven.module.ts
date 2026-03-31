/**
 * Event-Driven Architecture Module
 * 
 * Demonstrates event-driven architecture with:
 * - Domain Events
 * - Event Bus (in-memory, can be replaced with Redis/RabbitMQ)
 * - Event Handlers
 * - Event Store (for persistence)
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain Events
// - Defined in domain/events/ (pure TypeScript, no dependencies)

// Application Layer
import { CreateGameWithEventsCommand } from './application/commands/create-game-with-events.command';
import { CompleteGameWithEventsCommand } from './application/commands/complete-game-with-events.command';

// Event Bus Port & Implementation
import { EVENT_BUS, EVENT_STORE } from './application/ports/event-bus.port';
import { InMemoryEventBus } from './infrastructure/event-bus/in-memory-event-bus';
import { EventStoreImpl } from './infrastructure/event-bus/event-store.impl';

// Event Handlers (auto-subscribe on module init)
import { NotifyGameStartedHandler } from './application/event-handlers/notify-game-started.handler';
import { UpdateUserStatsHandler } from './application/event-handlers/update-user-stats.handler';

// Repository Interfaces & Implementations
import { USER_REPOSITORY, GAME_REPOSITORY } from './domain/repository-interfaces';
import { UserRepositoryImpl } from './infrastructure/database/repositories/user.repository.impl';
import { GameRepositoryImpl } from './infrastructure/database/repositories/game.repository.impl';

// TypeORM Entities
import { User } from './user/entities/user.entity';
import { Game } from './game/entities/game.entity';
import { GameParticipant } from './game/entities/game-participant.entity';
import { EventEntity } from './infrastructure/event-bus/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Game,
      GameParticipant,
      EventEntity, // For event store
    ]),
  ],
  providers: [
    // Commands with Event Publishing
    CreateGameWithEventsCommand,
    CompleteGameWithEventsCommand,

    // Event Bus (infrastructure)
    {
      provide: EVENT_BUS,
      useClass: InMemoryEventBus,
    },

    // Event Store (optional - for event sourcing)
    {
      provide: EVENT_STORE,
      useClass: EventStoreImpl,
    },

    // Event Handlers (they auto-subscribe to events)
    NotifyGameStartedHandler,
    UpdateUserStatsHandler,

    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: GAME_REPOSITORY,
      useClass: GameRepositoryImpl,
    },
  ],
  exports: [
    // Export commands for use in controllers
    CreateGameWithEventsCommand,
    CompleteGameWithEventsCommand,
    // Export event bus for custom event publishing
    EVENT_BUS,
  ],
})
export class EventDrivenModule {}
