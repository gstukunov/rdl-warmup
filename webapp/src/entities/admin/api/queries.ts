import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './adminApi';
import type { CreateCompletedGameRequest, SubmitGameResultsRequest } from '../model';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  completedGames: () => [...adminKeys.all, 'completed-games'] as const,
  gameDetails: (id: string) => [...adminKeys.all, 'game', id] as const,
};

// Get all users (for selection)
export const useUsers = () => {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => adminApi.getUsers(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Get completed games
export const useCompletedGames = () => {
  return useQuery({
    queryKey: adminKeys.completedGames(),
    queryFn: () => adminApi.getCompletedGames(),
  });
};

// Get game details for admin
export const useAdminGameDetails = (gameId: string | undefined) => {
  return useQuery({
    queryKey: adminKeys.gameDetails(gameId || ''),
    queryFn: () => adminApi.getGameDetails(gameId!),
    enabled: !!gameId,
  });
};

// Submit game results mutation
export const useSubmitGameResults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitGameResultsRequest) =>
      adminApi.submitGameResults(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.completedGames() });
    },
  });
};

// Create completed game mutation
export const useCreateCompletedGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompletedGameRequest) =>
      adminApi.createCompletedGame(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.completedGames() });
    },
  });
};
