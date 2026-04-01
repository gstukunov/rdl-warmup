import type { GameStatus } from '../../game/entities/game.entity';
import type { ParticipantRole } from '../../game/entities/game-participant.entity';

// Response DTOs
export interface WebAppConfigResponse {
  botUsername: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
}

export interface GameListItemDto {
  id: string;
  name: string;
  description: string | null;
  status: GameStatus;
  maxParticipants: number;
  participantCount: number;
  isUserRegistered: boolean;
  createdAt: string;
}

export interface GameParticipantDto {
  id: string;
  telegramId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: ParticipantRole;
  position: string;
  teamName: string | null;
  isRegistered: boolean;
  registeredAt: string;
}

export interface GameDetailsDto extends GameListItemDto {
  motion: string | null;
  startTime: string | null;
  endTime: string | null;
  createdByTelegramId: number | null;
  isAllocated: boolean;
  participants: GameParticipantDto[];
}

export interface UserProfileDto {
  user: {
    id: string;
    telegramId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
    createdAt: string;
  };
  gamesPlayed: number;
  averageSpeakerScore: number;
}

export interface JudgeStatsDto {
  averageScore: number;
  totalFeedbacks: number;
}

export interface RoomParticipantDto {
  telegramId: number | null;
  username: string | null;
  firstName: string | null;
  isIronman: boolean;
}

export interface RoomJudgeDto {
  telegramId: number | null;
  username: string | null;
  firstName: string | null;
  role: 'chair' | 'wing';
}

export interface RoomAllocationDto {
  roomNumber: number;
  openingGovernment: RoomParticipantDto[];
  openingOpposition: RoomParticipantDto[];
  closingGovernment: RoomParticipantDto[];
  closingOpposition: RoomParticipantDto[];
  judges: RoomJudgeDto[];
  wings: RoomJudgeDto[];
}

// Request DTOs
export interface JoinGameRequestDto {
  role: 'player' | 'judge' | 'wing';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
