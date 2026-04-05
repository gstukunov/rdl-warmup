import { gameApi } from '@/entities/game';
import type { ParticipantRole } from '@/entities/game';

export const joinGameApi = {
  joinGame: (gameId: string, role: ParticipantRole) =>
    gameApi.joinGame(gameId, role),
};
