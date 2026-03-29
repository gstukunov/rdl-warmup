import { ApiProperty } from '@nestjs/swagger';

class AllocatedPlayerDto {
  @ApiProperty({
    description: 'Telegram ID of the player',
    example: 123456789,
  })
  telegramId: number;

  @ApiProperty({
    description: 'Telegram username',
    example: 'john_doe',
  })
  username: string | null;

  @ApiProperty({
    description: 'First name from Telegram',
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    description: 'Whether this player is an ironman (single player in position)',
    example: false,
  })
  isIronman: boolean;
}

class AllocatedJudgeDto {
  @ApiProperty({
    description: 'Telegram ID of the judge',
    example: 123456789,
  })
  telegramId: number;

  @ApiProperty({
    description: 'Telegram username',
    example: 'judge_jane',
  })
  username: string | null;

  @ApiProperty({
    description: 'First name from Telegram',
    example: 'Jane',
  })
  firstName: string | null;
}

class AllocatedWingDto {
  @ApiProperty({
    description: 'Telegram ID of the wing (judge assistant)',
    example: 123456789,
  })
  telegramId: number;

  @ApiProperty({
    description: 'Telegram username',
    example: 'wing_user',
  })
  username: string | null;

  @ApiProperty({
    description: 'First name from Telegram',
    example: 'Wing',
  })
  firstName: string | null;
}

export class RoomAllocationResponseDto {
  @ApiProperty({
    description: 'Room number',
    example: 1,
  })
  roomNumber: number;

  @ApiProperty({
    description: 'Players in Opening Government position',
    type: [AllocatedPlayerDto],
  })
  openingGovernment: AllocatedPlayerDto[];

  @ApiProperty({
    description: 'Players in Opening Opposition position',
    type: [AllocatedPlayerDto],
  })
  openingOpposition: AllocatedPlayerDto[];

  @ApiProperty({
    description: 'Players in Closing Government position',
    type: [AllocatedPlayerDto],
  })
  closingGovernment: AllocatedPlayerDto[];

  @ApiProperty({
    description: 'Players in Closing Opposition position',
    type: [AllocatedPlayerDto],
  })
  closingOpposition: AllocatedPlayerDto[];

  @ApiProperty({
    description: 'Judges assigned to this room',
    type: [AllocatedJudgeDto],
  })
  judges: AllocatedJudgeDto[];

  @ApiProperty({
    description: 'Wings (judge assistants) assigned to this room',
    type: [AllocatedWingDto],
  })
  wings: AllocatedWingDto[];
}
