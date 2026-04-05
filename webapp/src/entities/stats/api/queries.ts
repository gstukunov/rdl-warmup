import { useQuery } from '@tanstack/react-query';
import { statsApi } from './statsApi';

// Query keys
export const statsKeys = {
  all: ['stats'] as const,
  lists: () => [...statsKeys.all, 'list'] as const,
};

// Get public stats
export const useStats = () => {
  return useQuery({
    queryKey: statsKeys.lists(),
    queryFn: () => statsApi.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes - stats update frequently
  });
};
