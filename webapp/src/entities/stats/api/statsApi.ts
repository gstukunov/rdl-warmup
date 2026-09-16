import { apiClient } from '@/shared/api';
import type { StatsResponse, GameParticipation, GameMotion } from '../model';

export const statsApi = {
  getStats: () => apiClient.get<StatsResponse>('/stats'),
  getGameParticipations: () => apiClient.get<GameParticipation[]>('/stats/games'),
  getGameMotions: () => apiClient.get<GameMotion[]>('/stats/motions'),
  // Direct download URL of the Excel export (a file, not the JSON envelope)
  getGameVisitsExportUrl: () => apiClient.resolveUrl('/stats/games/export'),
};
