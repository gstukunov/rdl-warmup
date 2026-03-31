import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from '../entities/game.entity';
import { IGameRepository } from './game.repository.interface';

@Injectable()
export class GameRepository implements IGameRepository {
  constructor(
    @InjectRepository(Game)
    private readonly repository: Repository<Game>,
  ) {}

  async findById(id: string, relations: string[] = []): Promise<Game | null> {
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    return this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async findOpenGames(): Promise<Game[]> {
    return this.repository.find({
      where: { status: GameStatus.REGISTRATION },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveGamesForUser(telegramId: number): Promise<Game[]> {
    return this.repository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.participants', 'participant')
      .where('participant.telegramId = :telegramId', { telegramId })
      .andWhere('game.status NOT IN (:...completedStatuses)', {
        completedStatuses: [GameStatus.COMPLETED, GameStatus.CANCELLED],
      })
      .orderBy('participant.registeredAt', 'DESC')
      .getMany();
  }

  async create(gameData: Partial<Game>): Promise<Game> {
    const game = this.repository.create(gameData);
    return this.repository.save(game);
  }

  async save(game: Game): Promise<Game> {
    return this.repository.save(game);
  }

  async update(gameId: string, gameData: Partial<Game>): Promise<void> {
    await this.repository.update(gameId, gameData);
  }

  async delete(gameId: string): Promise<void> {
    await this.repository.delete(gameId);
  }

  async exists(gameId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id: gameId } });
    return count > 0;
  }
}
