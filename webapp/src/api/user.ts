import { apiClient } from './client';
import type { UserProfile, JudgeStats, WebAppConfig } from '../types';

export const userApi = {
  // Get current user profile
  getProfile: () => apiClient.get<UserProfile>('/profile'),

  // Get judge stats
  getJudgeStats: () => apiClient.get<JudgeStats>('/profile/judge-stats'),

  // Get webapp config
  getConfig: () => apiClient.get<WebAppConfig>('/config'),
};
