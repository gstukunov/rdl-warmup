import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UserModule } from '../user/user.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [UserModule, GameModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
