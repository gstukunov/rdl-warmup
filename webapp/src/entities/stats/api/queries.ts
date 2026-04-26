import { useQuery } from '@tanstack/react-query';
import { statsApi } from './statsApi';

// Query keys
export const statsKeys = {
  all: ['stats'] as const,
  lists: () => [...statsKeys.all, 'list'] as const,
  games: () => [...statsKeys.all, 'games'] as const,
};

// Get public stats
export const useStats = () => {
  return useQuery({
    queryKey: statsKeys.lists(),
    queryFn: () => statsApi.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes - stats update frequently
  });
};

// Get game participations
export const useGameParticipations = () => {
  return useQuery({
    queryKey: statsKeys.games(),
    queryFn: () => statsApi.getGameParticipations(),
    staleTime: 1000 * 60 * 2,
  });
};
