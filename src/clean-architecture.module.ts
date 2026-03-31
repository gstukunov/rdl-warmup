/**
 * Clean Architecture Module
 * 
 * Demonstrates the new Clean Architecture structure alongside the existing code.
 * 
 * Layer structure:
 * - Domain: Entities, Value Objects, Repository Interfaces
 * - Application: Commands, Queries, DTOs
 * - Infrastructure: TypeORM implementations, Mappers
 * - Presentation: Controllers
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain Layer (no dependencies)
// - Entities, Value Objects, Repository Interfaces are pure TypeScript

// Application Layer (depends only on Domain)
import { CreateGameCommand } from './application/commands/create-game.command';
import { RegisterUserCommand } from './application/commands/register-user.command';
import { GetGameByIdQuery } from './application/queries/get-game-by-id.query';
import { GetOpenGamesQuery } from './application/queries/get-open-games.query';

// Infrastructure Layer (depends on Domain and Application)
import { UserRepositoryImpl } from './infrastructure/database/repositories/user.repository.impl';
import { GameRepositoryImpl } from './infrastructure/database/repositories/game.repository.impl';

// Repository Interfaces (Domain)
import { USER_REPOSITORY } from './domain/repository-interfaces/user.repository';
import { GAME_REPOSITORY } from './domain/repository-interfaces/game.repository';

// Presentation Layer (depends on Application)
import { CleanGameController } from './presentation/controllers/clean-game.controller';

// TypeORM Entities (existing infrastructure)
import { User } from './user/entities/user.entity';
import { Game } from './game/entities/game.entity';
import { GameParticipant } from './game/entities/game-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Game,
      GameParticipant,
    ]),
  ],
  controllers: [
    CleanGameController,
  ],
  providers: [
    // Application Layer - Commands & Queries
    CreateGameCommand,
    RegisterUserCommand,
    GetGameByIdQuery,
    GetOpenGamesQuery,

    // Infrastructure Layer - Repository Implementations
    // We bind the implementation to the interface token
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
    // Export the repository tokens for other modules
    USER_REPOSITORY,
    GAME_REPOSITORY,
    // Export commands and queries for potential reuse
    CreateGameCommand,
    RegisterUserCommand,
    GetGameByIdQuery,
    GetOpenGamesQuery,
  ],
})
export class CleanArchitectureModule {}
