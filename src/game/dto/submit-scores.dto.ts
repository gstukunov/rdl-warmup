import { IsString, IsUUID, Matches, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitScoresDto {
  @ApiPropertyOptional({
    description: 'Game ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  gameId?: string;

  @ApiPropertyOptional({
    description: 'Opening Government scores (player1/player2). For ironman, both scores are entered but only highest is saved.',
    example: '75/78',
    pattern: '^\\d{1,3}\\/\\d{1,3}$',
  })
  @IsString()
  @Matches(/^\d{1,3}\/\d{1,3}$/, { message: 'Format should be "score1/score2", e.g., "75/78"' })
  @IsOptional()
  openingGovernment?: string;

  @ApiPropertyOptional({
    description: 'Opening Opposition scores (player1/player2). For ironman, both scores are entered but only highest is saved.',
    example: '72/74',
    pattern: '^\\d{1,3}\\/\\d{1,3}$',
  })
  @IsString()
  @Matches(/^\d{1,3}\/\d{1,3}$/, { message: 'Format should be "score1/score2", e.g., "75/78"' })
  @IsOptional()
  openingOpposition?: string;

  @ApiPropertyOptional({
    description: 'Closing Government scores (player1/player2). For ironman, both scores are entered but only highest is saved. Only required if position exists in game.',
    example: '76/73',
    pattern: '^\\d{1,3}\\/\\d{1,3}$',
  })
  @IsString()
  @Matches(/^\d{1,3}\/\d{1,3}$/, { message: 'Format should be "score1/score2", e.g., "75/78"' })
  @IsOptional()
  closingGovernment?: string;

  @ApiPropertyOptional({
    description: 'Closing Opposition scores (player1/player2). For ironman, both scores are entered but only highest is saved. Only required if position exists in game.',
    example: '71/75',
    pattern: '^\\d{1,3}\\/\\d{1,3}$',
  })
  @IsString()
  @Matches(/^\d{1,3}\/\d{1,3}$/, { message: 'Format should be "score1/score2", e.g., "75/78"' })
  @IsOptional()
  closingOpposition?: string;
}

export interface ParsedScores {
  position: string;
  score1: number;
  score2: number;
}
