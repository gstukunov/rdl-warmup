import type { ParticipantRole } from '@/entities/game';

export interface JoinGameParams {
  gameId: string;
  role: ParticipantRole;
}

export interface JoinGameState {
  isLoading: boolean;
  error: string | null;
}
