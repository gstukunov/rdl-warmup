import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Game } from './entities/game.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { SpeakerScore } from './entities/speaker-score.entity';
import { JudgeFeedback } from './entities/judge-feedback.entity';
import { User } from '../telegram/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameParticipant, SpeakerScore, JudgeFeedback, User])],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
