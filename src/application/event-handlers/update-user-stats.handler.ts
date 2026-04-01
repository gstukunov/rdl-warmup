/**
 * Update User Stats Handler
 * 
 * Logs game completion events. User stats (games played, average score)
 * are now calculated on-demand from the speaker_scores table.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { GameCompletedEvent } from '../../domain/events/game-completed.event';
import type { IEventBus } from '../ports/event-bus.port';
import { EVENT_BUS } from '../ports/event-bus.port';

@Injectable()
export class UpdateUserStatsHandler {
  private readonly logger = new Logger(UpdateUserStatsHandler.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {
    this.subscribe();
  }

  private subscribe(): void {
    this.eventBus.subscribe<GameCompletedEvent>('game.completed', async (event) => {
      await this.handle(event);
    });
  }

  async handle(event: GameCompletedEvent): Promise<void> {
    this.logger.log(
      `Game completed: ${event.game.name}. ` +
      `Processed ${event.playerResults.length} player results. ` +
      `Stats are calculated on-demand from speaker_scores table.`
    );
  }
}
