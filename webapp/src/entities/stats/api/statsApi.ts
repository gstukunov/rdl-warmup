import { apiClient } from '@/shared/api';
import type { StatsResponse } from '../model';

export const statsApi = {
  getStats: () => apiClient.get<StatsResponse>('/stats'),
};
