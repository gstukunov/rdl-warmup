import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';

// Entities
import { Game } from './entities/game.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { SpeakerScore } from './entities/speaker-score.entity';
import { JudgeFeedback } from './entities/judge-feedback.entity';
import { RoomAllocation } from './entities/room-allocation.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomJudge } from './entities/room-judge.entity';

// Services
import {
  GameManagementService,
  RoomAllocationService,
  ScoringService,
  JudgeFeedbackService,
  GameRegistrationService,
  GameBotService,
} from './services';

// Repositories
import {
  GameRepository,
  GameParticipantRepository,
  SpeakerScoreRepository,
  JudgeFeedbackRepository,
  GAME_REPOSITORY,
  GAME_PARTICIPANT_REPOSITORY,
  SPEAKER_SCORE_REPOSITORY,
  JUDGE_FEEDBACK_REPOSITORY,
} from './repositories';

// User Module for user management
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GameParticipant,
      SpeakerScore,
      JudgeFeedback,
      RoomAllocation,
      RoomParticipant,
      RoomJudge,
    ]),
    UserModule,
  ],
  controllers: [GameController],
  providers: [
    // Facade service
    GameService,
    
    // Specialized services
    GameManagementService,
    RoomAllocationService,
    ScoringService,
    JudgeFeedbackService,
    GameRegistrationService,
    GameBotService,
    
    // Repository implementations
    {
      provide: GAME_REPOSITORY,
      useClass: GameRepository,
    },
    {
      provide: GAME_PARTICIPANT_REPOSITORY,
      useClass: GameParticipantRepository,
    },
    {
      provide: SPEAKER_SCORE_REPOSITORY,
      useClass: SpeakerScoreRepository,
    },
    {
      provide: JUDGE_FEEDBACK_REPOSITORY,
      useClass: JudgeFeedbackRepository,
    },
  ],
  exports: [
    GameService,
    GameManagementService,
    RoomAllocationService,
    ScoringService,
    JudgeFeedbackService,
    GameRegistrationService,
    GameBotService,
    GAME_REPOSITORY,
    GAME_PARTICIPANT_REPOSITORY,
    SPEAKER_SCORE_REPOSITORY,
    JUDGE_FEEDBACK_REPOSITORY,
  ],
})
export class GameModule {}
