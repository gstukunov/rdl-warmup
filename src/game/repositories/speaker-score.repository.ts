import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeakerScore } from '../entities/speaker-score.entity';
import { ISpeakerScoreRepository } from './speaker-score.repository.interface';

@Injectable()
export class SpeakerScoreRepository implements ISpeakerScoreRepository {
  constructor(
    @InjectRepository(SpeakerScore)
    private readonly repository: Repository<SpeakerScore>,
  ) {}

  async findById(id: string): Promise<SpeakerScore | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByGameId(gameId: string): Promise<SpeakerScore[]> {
    return this.repository.find({
      where: { gameId },
      order: { submittedAt: 'DESC' },
    });
  }

  async findByGameAndJudge(
    gameId: string, 
    judgeTelegramId: number
  ): Promise<SpeakerScore[]> {
    return this.repository.find({
      where: { gameId, judgeTelegramId },
    });
  }

  async findByGameAndTelegramId(
    gameId: string, 
    telegramId: number
  ): Promise<SpeakerScore[]> {
    return this.repository.find({
      where: { gameId, telegramId },
    });
  }

  async findByTelegramId(telegramId: number): Promise<SpeakerScore[]> {
    return this.repository.find({
      where: { telegramId },
      order: { submittedAt: 'DESC' },
    });
  }

  async existsByGameAndJudge(gameId: string, judgeTelegramId: number): Promise<boolean> {
    const count = await this.repository.count({
      where: { gameId, judgeTelegramId },
    });
    return count > 0;
  }

  async create(scoreData: Partial<SpeakerScore>): Promise<SpeakerScore> {
    const score = this.repository.create(scoreData);
    return this.repository.save(score);
  }

  async save(score: SpeakerScore): Promise<SpeakerScore> {
    return this.repository.save(score);
  }

  async saveMany(scores: SpeakerScore[]): Promise<SpeakerScore[]> {
    return this.repository.save(scores);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getAverageScoreForUser(telegramId: number): Promise<number | null> {
    const result = await this.repository
      .createQueryBuilder('score')
      .select('AVG(score.score)', 'average')
      .where('score.telegramId = :telegramId', { telegramId })
      .getRawOne();
    
    return result?.average ? Number(result.average) : null;
  }

  async getGamesPlayedCount(telegramId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('score')
      .select('COUNT(DISTINCT score.gameId)', 'count')
      .where('score.telegramId = :telegramId', { telegramId })
      .getRawOne();
    
    return result?.count ? Number(result.count) : 0;
  }
}
