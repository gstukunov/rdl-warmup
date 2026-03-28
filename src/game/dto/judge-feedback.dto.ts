import { IsInt, Min, Max, IsString, IsOptional, Length, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitJudgeFeedbackDto {
  @ApiProperty({
    description: 'Game ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  gameId: string;

  @ApiProperty({
    description: 'Judge Telegram ID',
    example: 123456789,
  })
  @IsInt()
  judgeTelegramId: number;

  @ApiProperty({
    description: 'Score for the judge (1-10)',
    example: 8,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  score: number;

  @ApiPropertyOptional({
    description: 'Optional text feedback for the judge',
    example: 'Great feedback and detailed explanations!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  feedback?: string;
}

export class JudgeFeedbackResponseDto {
  @ApiProperty({ description: 'Feedback ID' })
  id: string;

  @ApiProperty({ description: 'Game ID' })
  gameId: string;

  @ApiProperty({ description: 'Player Telegram ID' })
  playerTelegramId: number;

  @ApiProperty({ description: 'Judge Telegram ID' })
  judgeTelegramId: number;

  @ApiProperty({ description: 'Score (1-10)' })
  score: number;

  @ApiPropertyOptional({ description: 'Text feedback' })
  feedback: string | null;

  @ApiProperty({ description: 'Submission timestamp' })
  submittedAt: Date;
}

export class JudgeRatingDto {
  @ApiProperty({ description: 'Judge Telegram ID' })
  judgeTelegramId: number;

  @ApiProperty({ description: 'Judge name or username' })
  judgeName: string;

  @ApiProperty({ description: 'Average score' })
  averageScore: number;

  @ApiProperty({ description: 'Total number of feedbacks' })
  totalFeedbacks: number;
}
