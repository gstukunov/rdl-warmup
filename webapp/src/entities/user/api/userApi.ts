import { apiClient } from '@/shared/api';
import type { WebAppConfig } from '@/shared/api';
import type { UserProfile, JudgeStats, MeResponse } from '../model';

export const userApi = {
  // Get current user profile
  getProfile: () => apiClient.get<UserProfile>('/webapp/profile'),

  // Get judge stats
  getJudgeStats: () => apiClient.get<JudgeStats>('/webapp/profile/judge-stats'),

  // Get webapp config
  getConfig: () => apiClient.get<WebAppConfig>('/webapp/config'),

  // Check current user admin status
  getMe: () => apiClient.get<MeResponse>('/webapp/me'),
};
