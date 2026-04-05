import { gameApi } from '@/entities/game';

export const leaveGameApi = {
  leaveGame: (gameId: string) => gameApi.leaveGame(gameId),
};
