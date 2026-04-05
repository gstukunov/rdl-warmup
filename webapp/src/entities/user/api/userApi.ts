import { apiClient } from '@/shared/api';
import type { WebAppConfig } from '@/shared/api';
import type { UserProfile, JudgeStats } from '../model';

export const userApi = {
  // Get current user profile
  getProfile: () => apiClient.get<UserProfile>('/profile'),

  // Get judge stats
  getJudgeStats: () => apiClient.get<JudgeStats>('/profile/judge-stats'),

  // Get webapp config
  getConfig: () => apiClient.get<WebAppConfig>('/config'),
};
