import { JudgeFeedback } from '../entities/judge-feedback.entity';

export interface IJudgeFeedbackRepository {
  findById(id: string): Promise<JudgeFeedback | null>;
  findByGameId(gameId: string): Promise<JudgeFeedback[]>;
  findByGameAndPlayer(gameId: string, playerTelegramId: number): Promise<JudgeFeedback[]>;
  findByGameAndJudge(gameId: string, judgeTelegramId: number): Promise<JudgeFeedback[]>;
  findByJudgeTelegramId(judgeTelegramId: number): Promise<JudgeFeedback[]>;
  existsByGamePlayerAndJudge(
    gameId: string, 
    playerTelegramId: number, 
    judgeTelegramId: number
  ): Promise<boolean>;
  create(feedbackData: Partial<JudgeFeedback>): Promise<JudgeFeedback>;
  save(feedback: JudgeFeedback): Promise<JudgeFeedback>;
  delete(id: string): Promise<void>;
  getAverageScoreForJudge(judgeTelegramId: number): Promise<{ average: number; count: number }>;
}

export const JUDGE_FEEDBACK_REPOSITORY = Symbol('JUDGE_FEEDBACK_REPOSITORY');
