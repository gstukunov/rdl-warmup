import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Game } from './entities/game.entity';
import { GameParticipant } from './entities/game-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameParticipant])],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
