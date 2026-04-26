import { apiClient } from '@/shared/api';
import type { StatsResponse, GameParticipation } from '../model';

export const statsApi = {
  getStats: () => apiClient.get<StatsResponse>('/stats'),
  getGameParticipations: () => apiClient.get<GameParticipation[]>('/stats/games'),
};
