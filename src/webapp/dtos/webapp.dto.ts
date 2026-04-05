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

// Admin DTOs
export interface AdminLoginRequestDto {
  password: string;
}

export interface AdminLoginResponseDto {
  token: string;
}

export interface UserOptionDto {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
}

export interface CompletedGameListItemDto {
  id: string;
  name: string;
  description: string | null;
  motion: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  participantCount: number;
  hasResults: boolean;
}

export interface SpeakerResultDto {
  telegramId: number | null;
  score: number;
}

export interface PositionResultDto {
  speaker1: SpeakerResultDto;
  speaker2: SpeakerResultDto;
  isIronman: boolean;
}

export interface SubmitGameResultsRequestDto {
  gameId: string;
  motion: string;
  openingGovernment: PositionResultDto;
  openingOpposition: PositionResultDto;
  closingGovernment?: PositionResultDto;
  closingOpposition?: PositionResultDto;
  judgeTelegramId: number;
}

export interface CreateCompletedGameRequestDto {
  gameName: string;
  motion: string;
  openingGovernment: PositionResultDto;
  openingOpposition: PositionResultDto;
  closingGovernment?: PositionResultDto;
  closingOpposition?: PositionResultDto;
  judgeTelegramId: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
