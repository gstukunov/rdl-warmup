/**
 * Update User Stats Handler
 * 
 * Updates user statistics when a game is completed.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { GameCompletedEvent } from '../../domain/events/game-completed.event';
import type { IUserRepository } from '../../domain/repository-interfaces/user.repository';
import { USER_REPOSITORY } from '../../domain/repository-interfaces/user.repository';
import type { IEventBus } from '../ports/event-bus.port';
import { EVENT_BUS } from '../ports/event-bus.port';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo';

@Injectable()
export class UpdateUserStatsHandler {
  private readonly logger = new Logger(UpdateUserStatsHandler.name);

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
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
      `Updating stats for ${event.playerResults.length} players from completed game`
    );

    for (const result of event.playerResults) {
      try {
        const telegramId = TelegramId.create(result.telegramId);
        const user = await this.userRepository.findByTelegramId(telegramId);

        if (!user) {
          this.logger.warn(`User not found: ${result.telegramId}`);
          continue;
        }

        // Update user stats
        user.incrementGamesPlayed();
        
        // Add points based on score (simplified)
        const points = Math.floor(result.averageScore / 10);
        user.addPoints(points);

        await this.userRepository.save(user);

        this.logger.debug(
          `Updated stats for user ${result.telegramId}: games=${user.gamesPlayed}, points=${user.totalPoints}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to update stats for user ${result.telegramId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }
  }
}
