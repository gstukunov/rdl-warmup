import { GameParticipant, ParticipantRole, ParticipantPosition } from '../entities/game-participant.entity';

export interface IGameParticipantRepository {
  findById(id: string): Promise<GameParticipant | null>;
  findByGameId(gameId: string): Promise<GameParticipant[]>;
  findByGameAndTelegramId(gameId: string, telegramId: number): Promise<GameParticipant | null>;
  findByTelegramId(telegramId: number): Promise<GameParticipant[]>;
  findByGameAndRole(gameId: string, role: ParticipantRole): Promise<GameParticipant[]>;
  countByGameAndRole(gameId: string, role: ParticipantRole): Promise<number>;
  create(participantData: Partial<GameParticipant>): Promise<GameParticipant>;
  save(participant: GameParticipant): Promise<GameParticipant>;
  update(participantId: string, participantData: Partial<GameParticipant>): Promise<void>;
  updateByGameAndTelegramId(
    gameId: string, 
    telegramId: number, 
    participantData: Partial<GameParticipant>
  ): Promise<void>;
  delete(participant: GameParticipant): Promise<void>;
  deleteByGameAndTelegramId(gameId: string, telegramId: number): Promise<void>;
  exists(gameId: string, telegramId: number): Promise<boolean>;
}

export const GAME_PARTICIPANT_REPOSITORY = Symbol('GAME_PARTICIPANT_REPOSITORY');
