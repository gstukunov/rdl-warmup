import { apiClient } from '@/shared/api';
import type { Game, GameDetails, RoomAllocation } from '../model';

export const gameApi = {
  // Get list of open games
  getOpenGames: () => apiClient.get<Game[]>('/games'),

  // Get game details by ID
  getGameById: (id: string) => apiClient.get<GameDetails>(`/games/${id}`),

  // Get user's active game
  getMyGame: () => apiClient.get<GameDetails | null>('/games/my'),

  // Join a game
  joinGame: (gameId: string, role: 'player' | 'judge' | 'wing') =>
    apiClient.post<void>(`/games/${gameId}/join`, { role }),

  // Leave a game
  leaveGame: (gameId: string) =>
    apiClient.post<void>(`/games/${gameId}/leave`),

  // Get room allocations
  getRoomAllocations: (gameId: string) =>
    apiClient.get<RoomAllocation[]>(`/games/${gameId}/rooms`),
};
