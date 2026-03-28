import { IsString, IsOptional, IsInt, Min, Max, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PlayerResultDto {
  @ApiProperty({
    description: 'Telegram ID of the player (user must be registered in bot)',
    example: 123456789,
  })
  @IsInt()
  telegramId: number;

  @ApiProperty({
    description: 'Position: OG (Opening Government), OO (Opening Opposition), CG (Closing Government), CO (Closing Opposition)',
    example: 'OG',
    enum: ['OG', 'OO', 'CG', 'CO'],
  })
  @IsString()
  position: 'OG' | 'OO' | 'CG' | 'CO';

  @ApiProperty({
    description: 'Speaker scores for this player (if ironman, provide two scores, only highest will be saved)',
    example: [75, 78],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  scores: number[];

  @ApiPropertyOptional({
    description: 'Whether this player is ironman (playing both speeches in the position)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isIronman?: boolean;
}

export class JudgeResultDto {
  @ApiProperty({
    description: 'Telegram ID of the judge (user must be registered in bot)',
    example: 987654321,
  })
  @IsInt()
  telegramId: number;
}

export class ImportGameResultDto {
  @ApiPropertyOptional({
    description: 'Game name (optional, will be auto-generated if not provided)',
    example: 'Practice Debate #1',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Motion of the debate',
    example: 'This house would ban social media for children under 16',
  })
  @IsString()
  motion: string;

  @ApiProperty({
    description: 'List of players with their positions and scores',
    type: [PlayerResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerResultDto)
  players: PlayerResultDto[];

  @ApiProperty({
    description: 'List of judges (at least one required)',
    type: [JudgeResultDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgeResultDto)
  judges: JudgeResultDto[];

  @ApiPropertyOptional({
    description: 'Game date (optional, defaults to now)',
    example: '2026-03-28T10:00:00Z',
  })
  @IsString()
  @IsOptional()
  gameDate?: string;
}
