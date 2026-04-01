import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';
import { USER_REPOSITORY } from './repositories/user.repository.interface';
import { SpeakerScore } from '../game/entities/speaker-score.entity';
import { SpeakerScoreRepository } from '../game/repositories/speaker-score.repository';
import { SPEAKER_SCORE_REPOSITORY } from '../game/repositories/speaker-score.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([User, SpeakerScore])],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: SPEAKER_SCORE_REPOSITORY,
      useClass: SpeakerScoreRepository,
    },
  ],
  exports: [UserService, USER_REPOSITORY],
})
export class UserModule {}
