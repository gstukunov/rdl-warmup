import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebAppController } from './webapp.controller';
import { WebAppService } from './webapp.service';
import { Game } from '../game/entities/game.entity';
import { GameParticipant } from '../game/entities/game-participant.entity';
import { User } from '../user/entities/user.entity';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { JudgeFeedback } from '../game/entities/judge-feedback.entity';
import { RoomAllocation } from '../game/entities/room-allocation.entity';
import { RoomParticipant } from '../game/entities/room-participant.entity';
import { RoomJudge } from '../game/entities/room-judge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GameParticipant,
      User,
      SpeakerScore,
      JudgeFeedback,
      RoomAllocation,
      RoomParticipant,
      RoomJudge,
    ]),
  ],
  controllers: [WebAppController],
  providers: [WebAppService],
})
export class WebAppModule {}
