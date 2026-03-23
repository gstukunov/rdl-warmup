import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ParticipantRole } from '../entities/game-participant.entity';

export class RegisterForGameDto {
  @ApiProperty({
    description: 'Role in the game',
    enum: ParticipantRole,
    enumName: 'ParticipantRole',
    example: ParticipantRole.PLAYER,
  })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;
}
