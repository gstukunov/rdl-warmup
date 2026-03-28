import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetMotionDto {
  @ApiProperty({
    description: 'Debate topic/motion',
    example: 'This house would ban artificial intelligence',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  motion: string;
}
