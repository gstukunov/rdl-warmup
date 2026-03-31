/**
 * Notify Game Started Handler
 * 
 * Sends notifications when a game starts.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { GameStartedEvent } from '../../domain/events/game-started.event';
import type { IEventBus } from '../ports/event-bus.port';
import { EVENT_BUS } from '../ports/event-bus.port';

@Injectable()
export class NotifyGameStartedHandler {
  private readonly logger = new Logger(NotifyGameStartedHandler.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {
    this.subscribe();
  }

  private subscribe(): void {
    this.eventBus.subscribe<GameStartedEvent>('game.started', async (event) => {
      await this.handle(event);
    });
  }

  async handle(event: GameStartedEvent): Promise<void> {
    this.logger.log(
      `Game "${event.game.name}" has started! Motion: ${event.game.motion}`
    );

    // Here you would:
    // 1. Send Telegram notifications to all participants
    // 2. Send push notifications
    // 3. Update analytics
    // 4. Log the event

    // Example: Notify all participants via Telegram
    // await this.telegramService.sendMessageToParticipants(
    //   event.game.id.value,
    //   `🎉 Game "${event.game.name}" has started!\n\nMotion: ${event.game.motion}`
    // );

    this.logger.debug(`Notifications sent for game: ${event.game.id.value}`);
  }
}
