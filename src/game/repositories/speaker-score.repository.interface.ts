import { SpeakerScore } from '../entities/speaker-score.entity';

export interface ISpeakerScoreRepository {
  findById(id: string): Promise<SpeakerScore | null>;
  findByGameId(gameId: string): Promise<SpeakerScore[]>;
  findByGameAndJudge(gameId: string, judgeTelegramId: number): Promise<SpeakerScore[]>;
  findByGameAndTelegramId(gameId: string, telegramId: number): Promise<SpeakerScore[]>;
  findByTelegramId(telegramId: number): Promise<SpeakerScore[]>;
  existsByGameAndJudge(gameId: string, judgeTelegramId: number): Promise<boolean>;
  create(scoreData: Partial<SpeakerScore>): Promise<SpeakerScore>;
  save(score: SpeakerScore): Promise<SpeakerScore>;
  saveMany(scores: SpeakerScore[]): Promise<SpeakerScore[]>;
  delete(id: string): Promise<void>;
  getAverageScoreForUser(telegramId: number): Promise<number | null>;
  getGamesPlayedCount(telegramId: number): Promise<number>;
}

export const SPEAKER_SCORE_REPOSITORY = Symbol('SPEAKER_SCORE_REPOSITORY');
