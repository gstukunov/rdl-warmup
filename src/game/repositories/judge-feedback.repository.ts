import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JudgeFeedback } from '../entities/judge-feedback.entity';
import { IJudgeFeedbackRepository } from './judge-feedback.repository.interface';

@Injectable()
export class JudgeFeedbackRepository implements IJudgeFeedbackRepository {
  constructor(
    @InjectRepository(JudgeFeedback)
    private readonly repository: Repository<JudgeFeedback>,
  ) {}

  async findById(id: string): Promise<JudgeFeedback | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByGameId(gameId: string): Promise<JudgeFeedback[]> {
    return this.repository.find({
      where: { gameId },
      order: { submittedAt: 'DESC' },
    });
  }

  async findByGameAndPlayer(
    gameId: string, 
    playerTelegramId: number
  ): Promise<JudgeFeedback[]> {
    return this.repository.find({
      where: { gameId, playerTelegramId },
    });
  }

  async findByGameAndJudge(
    gameId: string, 
    judgeTelegramId: number
  ): Promise<JudgeFeedback[]> {
    return this.repository.find({
      where: { gameId, judgeTelegramId },
    });
  }

  async findByJudgeTelegramId(judgeTelegramId: number): Promise<JudgeFeedback[]> {
    return this.repository.find({
      where: { judgeTelegramId },
      order: { submittedAt: 'DESC' },
    });
  }

  async existsByGamePlayerAndJudge(
    gameId: string,
    playerTelegramId: number,
    judgeTelegramId: number,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: { gameId, playerTelegramId, judgeTelegramId },
    });
    return count > 0;
  }

  async create(feedbackData: Partial<JudgeFeedback>): Promise<JudgeFeedback> {
    const feedback = this.repository.create(feedbackData);
    return this.repository.save(feedback);
  }

  async save(feedback: JudgeFeedback): Promise<JudgeFeedback> {
    return this.repository.save(feedback);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getAverageScoreForJudge(
    judgeTelegramId: number
  ): Promise<{ average: number; count: number }> {
    const result = await this.repository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.score)', 'average')
      .addSelect('COUNT(*)', 'count')
      .where('feedback.judgeTelegramId = :judgeTelegramId', { judgeTelegramId })
      .getRawOne();

    return {
      average: result?.average ? Number(Number(result.average).toFixed(1)) : 0,
      count: result?.count ? parseInt(result.count, 10) : 0,
    };
  }
}
