/**
 * Game DTOs
 * 
 * Data Transfer Objects for game-related operations.
 * Used for API responses and serialization.
 */

import { Game, GameStatus } from '../../domain/entities/game.entity';

export interface GameDto {
  id: string;
  name: string;
  description: string | null;
  status: GameStatus;
  maxParticipants: number;
  participantCount: number;
  isAllocated: boolean;
  motion: string | null;
  startTime: Date | null;
  endTime: Date | null;
  createdAt: Date;
}

export interface GameDetailDto extends GameDto {
  participants: GameParticipantDto[];
  rooms: RoomAllocationDto[];
}

export interface GameParticipantDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  role: string;
  position: string | null;
  registeredAt: Date;
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

export interface RoomParticipantDto {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  isIronman: boolean;
}

export interface RoomJudgeDto {
  telegramId: number;
  username: string | null;
  firstName: string | null;
}

/**
 * Maps a domain Game entity to a GameDto
 */
export function mapGameToDto(game: Game, participantCount: number = 0): GameDto {
  return {
    id: game.id.value,
    name: game.name,
    description: game.description,
    status: game.status,
    maxParticipants: game.maxParticipants,
    participantCount,
    isAllocated: game.isAllocated,
    motion: game.motion,
    startTime: game.startTime,
    endTime: game.endTime,
    createdAt: game.createdAt,
  };
}
