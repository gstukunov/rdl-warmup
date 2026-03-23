import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty({
    description: 'Name of the game',
    example: 'British Parliamentary Debate #1',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the game',
    example: 'Weekly practice debate for advanced speakers',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of participants (players only, judges not counted)',
    minimum: 4,
    maximum: 16,
    default: 8,
    example: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(16)
  maxParticipants?: number;
}
