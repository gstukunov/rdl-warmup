import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  GameParticipant, 
  ParticipantRole, 
  ParticipantPosition 
} from '../entities/game-participant.entity';
import { IGameParticipantRepository } from './game-participant.repository.interface';

@Injectable()
export class GameParticipantRepository implements IGameParticipantRepository {
  constructor(
    @InjectRepository(GameParticipant)
    private readonly repository: Repository<GameParticipant>,
  ) {}

  async findById(id: string): Promise<GameParticipant | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByGameId(gameId: string): Promise<GameParticipant[]> {
    return this.repository.find({ where: { gameId } });
  }

  async findByGameAndTelegramId(
    gameId: string, 
    telegramId: number
  ): Promise<GameParticipant | null> {
    return this.repository.findOne({
      where: { gameId, telegramId },
    });
  }

  async findByTelegramId(telegramId: number): Promise<GameParticipant[]> {
    return this.repository.find({
      where: { telegramId },
      relations: ['game'],
      order: { registeredAt: 'DESC' },
    });
  }

  async findByGameAndRole(
    gameId: string, 
    role: ParticipantRole
  ): Promise<GameParticipant[]> {
    return this.repository.find({
      where: { gameId, role },
    });
  }

  async countByGameAndRole(gameId: string, role: ParticipantRole): Promise<number> {
    return this.repository.count({
      where: { gameId, role },
    });
  }

  async create(participantData: Partial<GameParticipant>): Promise<GameParticipant> {
    const participant = this.repository.create(participantData);
    return this.repository.save(participant);
  }

  async save(participant: GameParticipant): Promise<GameParticipant> {
    return this.repository.save(participant);
  }

  async update(participantId: string, participantData: Partial<GameParticipant>): Promise<void> {
    await this.repository.update(participantId, participantData);
  }

  async updateByGameAndTelegramId(
    gameId: string,
    telegramId: number,
    participantData: Partial<GameParticipant>,
  ): Promise<void> {
    await this.repository.update({ gameId, telegramId }, participantData);
  }

  async delete(participant: GameParticipant): Promise<void> {
    await this.repository.remove(participant);
  }

  async deleteByGameAndTelegramId(gameId: string, telegramId: number): Promise<void> {
    await this.repository.delete({ gameId, telegramId });
  }

  async exists(gameId: string, telegramId: number): Promise<boolean> {
    const count = await this.repository.count({
      where: { gameId, telegramId },
    });
    return count > 0;
  }
}
