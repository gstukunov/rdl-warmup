import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { User } from './entities/user.entity';
import { GameModule } from '../game/game.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), GameModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
