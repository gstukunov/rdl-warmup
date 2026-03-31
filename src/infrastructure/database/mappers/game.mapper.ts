/**
 * Game Mapper
 * 
 * Maps between domain Game entity and TypeORM Game entity.
 */

import { Game as DomainGame } from '../../../domain/entities/game.entity';
import { Game as TypeOrmGame } from '../../../game/entities/game.entity';
import { GameId } from '../../../domain/value-objects/game-id.vo';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo';

export class GameMapper {
  /**
   * Maps TypeORM entity to domain entity
   */
  static toDomain(typeOrmGame: TypeOrmGame): DomainGame {
    return DomainGame.reconstitute({
      id: GameId.reconstitute(typeOrmGame.id),
      name: typeOrmGame.name,
      description: typeOrmGame.description,
      status: typeOrmGame.status,
      maxParticipants: typeOrmGame.maxParticipants,
      createdByTelegramId: typeOrmGame.createdByTelegramId 
        ? TelegramId.reconstitute(typeOrmGame.createdByTelegramId)
        : null,
      isAllocated: typeOrmGame.isAllocated,
      motion: typeOrmGame.motion,
      startTime: typeOrmGame.startTime,
      endTime: typeOrmGame.endTime,
      createdAt: typeOrmGame.createdAt,
      updatedAt: typeOrmGame.updatedAt,
    });
  }

  /**
   * Maps domain entity to TypeORM entity
   */
  static toTypeOrm(domainGame: DomainGame): TypeOrmGame {
    const typeOrmGame = new TypeOrmGame();
    
    typeOrmGame.id = domainGame.id.value;
    typeOrmGame.name = domainGame.name;
    typeOrmGame.description = domainGame.description;
    typeOrmGame.status = domainGame.status;
    typeOrmGame.maxParticipants = domainGame.maxParticipants;
    typeOrmGame.createdByTelegramId = domainGame.createdByTelegramId?.value ?? null;
    typeOrmGame.isAllocated = domainGame.isAllocated;
    typeOrmGame.motion = domainGame.motion;
    typeOrmGame.startTime = domainGame.startTime;
    typeOrmGame.endTime = domainGame.endTime;
    typeOrmGame.createdAt = domainGame.createdAt;
    typeOrmGame.updatedAt = domainGame.updatedAt;
    typeOrmGame.settings = {}; // Keep empty for future extensibility
    typeOrmGame.totalRounds = 1;
    typeOrmGame.currentRound = 0;

    return typeOrmGame;
  }
}
