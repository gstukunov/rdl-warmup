import { useQuery } from '@tanstack/react-query';
import { userApi } from './userApi';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  judgeStats: () => [...userKeys.all, 'judge-stats'] as const,
  config: () => [...userKeys.all, 'config'] as const,
};

// Get user profile
export const useProfile = () => {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => userApi.getProfile(),
  });
};

// Get judge stats
export const useJudgeStats = () => {
  return useQuery({
    queryKey: userKeys.judgeStats(),
    queryFn: () => userApi.getJudgeStats(),
  });
};

// Get webapp config
export const useConfig = () => {
  return useQuery({
    queryKey: userKeys.config(),
    queryFn: () => userApi.getConfig(),
    staleTime: Infinity, // Config doesn't change during session
  });
};
