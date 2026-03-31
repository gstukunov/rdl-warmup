/**
 * Game Repository Implementation
 * 
 * Implements IGameRepository using TypeORM.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IGameRepository } from '../../../domain/repository-interfaces/game.repository';
import { Game as DomainGame, GameStatus } from '../../../domain/entities/game.entity';
import { Game as TypeOrmGame } from '../../../game/entities/game.entity';
import { GameParticipant } from '../../../game/entities/game-participant.entity';
import { GameId } from '../../../domain/value-objects/game-id.vo';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo';
import { GameMapper } from '../mappers/game.mapper';

@Injectable()
export class GameRepositoryImpl implements IGameRepository {
  constructor(
    @InjectRepository(TypeOrmGame)
    private readonly repository: Repository<TypeOrmGame>,
    @InjectRepository(GameParticipant)
    private readonly participantRepository: Repository<GameParticipant>,
  ) {}

  async findById(id: GameId): Promise<DomainGame | null> {
    const game = await this.repository.findOne({
      where: { id: id.value },
    });

    return game ? GameMapper.toDomain(game) : null;
  }

  async findByStatus(status: GameStatus): Promise<DomainGame[]> {
    const games = await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });

    return games.map(GameMapper.toDomain);
  }

  async findOpenForRegistration(): Promise<DomainGame[]> {
    const games = await this.repository.find({
      where: { status: GameStatus.REGISTRATION },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });

    return games.map(GameMapper.toDomain);
  }

  async findActiveGamesForUser(telegramId: TelegramId): Promise<DomainGame[]> {
    // Find games where user is a participant and status is not completed/cancelled
    const subQuery = this.participantRepository
      .createQueryBuilder('gp')
      .select('gp.game_id')
      .where('gp.telegram_id = :telegramId', { telegramId: telegramId.value });

    const games = await this.repository
      .createQueryBuilder('game')
      .where(`game.id IN (${subQuery.getQuery()})`)
      .andWhere('game.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [GameStatus.COMPLETED, GameStatus.CANCELLED],
      })
      .setParameter('telegramId', telegramId.value)
      .orderBy('game.created_at', 'DESC')
      .getMany();

    return games.map(GameMapper.toDomain);
  }

  async findByCreator(telegramId: TelegramId): Promise<DomainGame[]> {
    const games = await this.repository.find({
      where: { createdByTelegramId: telegramId.value },
      order: { createdAt: 'DESC' },
    });

    return games.map(GameMapper.toDomain);
  }

  async save(game: DomainGame): Promise<void> {
    const typeOrmGame = GameMapper.toTypeOrm(game);
    await this.repository.save(typeOrmGame);
  }

  async delete(id: GameId): Promise<void> {
    await this.repository.delete(id.value);
  }

  async exists(id: GameId): Promise<boolean> {
    const count = await this.repository.count({
      where: { id: id.value },
    });
    return count > 0;
  }
}
