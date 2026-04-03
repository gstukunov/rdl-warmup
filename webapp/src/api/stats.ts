import { apiClient } from './client';

export interface SpeakerStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  averageScore: number;
}

export interface JudgeStat {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string;
  gamesJudged: number;
  averageScore: number;
}

export interface StatsResponse {
  speakers: SpeakerStat[];
  judges: JudgeStat[];
}

export const statsApi = {
  getStats: () => apiClient.get<StatsResponse>('/stats'),
};
