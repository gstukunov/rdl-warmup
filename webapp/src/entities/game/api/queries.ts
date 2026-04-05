import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameApi } from './gameApi';
import type { ParticipantRole } from '../model';

// Query keys
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (filters: string) => [...gameKeys.lists(), { filters }] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: string) => [...gameKeys.details(), id] as const,
  my: () => [...gameKeys.all, 'my'] as const,
};

// Get all open games
export const useOpenGames = () => {
  return useQuery({
    queryKey: gameKeys.lists(),
    queryFn: () => gameApi.getOpenGames(),
  });
};

// Get game by ID
export const useGame = (id: string | undefined) => {
  return useQuery({
    queryKey: gameKeys.detail(id || ''),
    queryFn: () => gameApi.getGameById(id!), 
    enabled: !!id,
  });
};

// Get user's active game
export const useMyGame = () => {
  return useQuery({
    queryKey: gameKeys.my(),
    queryFn: () => gameApi.getMyGame(),
  });
};

// Join game mutation
export const useJoinGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, role }: { gameId: string; role: ParticipantRole }) =>
      gameApi.joinGame(gameId, role),
    onSuccess: (_, { gameId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: gameKeys.my() });
    },
  });
};

// Leave game mutation
export const useLeaveGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => gameApi.leaveGame(gameId),
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: gameKeys.my() });
    },
  });
};

// Get room allocations
export const useRoomAllocations = (gameId: string | undefined) => {
  return useQuery({
    queryKey: [...gameKeys.detail(gameId || ''), 'rooms'],
    queryFn: () => gameApi.getRoomAllocations(gameId!),
    enabled: !!gameId,
  });
};
