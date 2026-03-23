import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameStatus } from '../entities/game.entity';
import { ParticipantRole, ParticipantPosition } from '../entities/game-participant.entity';

export class GameParticipantResponseDto {
  @ApiProperty({
    description: 'Unique participant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Telegram ID of the participant',
    example: 123456789,
  })
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Telegram username',
    example: 'john_doe',
  })
  username: string | null;

  @ApiPropertyOptional({
    description: 'First name from Telegram',
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    description: 'Role in the game',
    enum: ParticipantRole,
    example: ParticipantRole.PLAYER,
  })
  role: ParticipantRole;

  @ApiProperty({
    description: 'Position in the debate (for BP format)',
    enum: ParticipantPosition,
    example: ParticipantPosition.OPENING_GOVERNMENT,
  })
  position: ParticipantPosition;

  @ApiProperty({
    description: 'Registration timestamp',
    example: '2026-03-23T18:30:00.000Z',
  })
  registeredAt: Date;
}

export class GameResponseDto {
  @ApiProperty({
    description: 'Unique game ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the game',
    example: 'British Parliamentary Debate #1',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the game',
    example: 'Weekly practice debate',
  })
  description: string | null;

  @ApiProperty({
    description: 'Current status of the game',
    enum: GameStatus,
    example: GameStatus.REGISTRATION,
  })
  status: GameStatus;

  @ApiProperty({
    description: 'Maximum number of players allowed',
    example: 8,
  })
  maxParticipants: number;

  @ApiProperty({
    description: 'Current number of registered participants',
    example: 5,
  })
  participantCount: number;

  @ApiPropertyOptional({
    description: 'Game start time (set when game starts)',
    example: '2026-03-23T19:00:00.000Z',
  })
  startTime: Date | null;

  @ApiPropertyOptional({
    description: 'Game end time (set when game completes)',
    example: '2026-03-23T20:30:00.000Z',
  })
  endTime: Date | null;

  @ApiPropertyOptional({
    description: 'Debate motion/topic',
    example: 'This house would ban artificial intelligence',
  })
  motion: string | null;

  @ApiProperty({
    description: 'Total number of rounds in the debate',
    example: 1,
  })
  totalRounds: number;

  @ApiProperty({
    description: 'Current round number',
    example: 0,
  })
  currentRound: number;

  @ApiProperty({
    description: 'Game creation timestamp',
    example: '2026-03-23T18:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-23T18:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'List of registered participants',
    type: [GameParticipantResponseDto],
  })
  participants?: GameParticipantResponseDto[];
}

export class GameParticipantSimpleResponseDto {
  @ApiProperty({
    description: 'Unique participant registration ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Game ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  gameId: string;

  @ApiProperty({
    description: 'Telegram ID of the participant',
    example: 123456789,
  })
  telegramId: number;

  @ApiPropertyOptional({
    description: 'Telegram username',
    example: 'john_doe',
  })
  username: string | null;

  @ApiPropertyOptional({
    description: 'First name from Telegram',
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    description: 'Role in the game',
    enum: ParticipantRole,
    example: ParticipantRole.PLAYER,
  })
  role: ParticipantRole;

  @ApiProperty({
    description: 'Registration timestamp',
    example: '2026-03-23T18:30:00.000Z',
  })
  registeredAt: Date;
}
