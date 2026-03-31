/**
 * Complete Game with Events Command
 * 
 * Demonstrates how to emit GameCompletedEvent and update stats asynchronously.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { GameId } from '../../domain/value-objects/game-id.vo';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo';
import type { IGameRepository } from '../../domain/repository-interfaces/game.repository';
import { GAME_REPOSITORY } from '../../domain/repository-interfaces/game.repository';
import type { IEventBus } from '../ports/event-bus.port';
import { EVENT_BUS } from '../ports/event-bus.port';
import { GameCompletedEvent, PlayerResult } from '../../domain/events/game-completed.event';

export interface CompleteGameWithEventsData {
  gameId: string;
  judgeTelegramId: number;
  playerResults: PlayerResult[];
}

export interface CompleteGameWithEventsResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class CompleteGameWithEventsCommand {
  private readonly logger = new Logger(CompleteGameWithEventsCommand.name);

  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(data: CompleteGameWithEventsData): Promise<CompleteGameWithEventsResult> {
    try {
      const gameId = GameId.fromString(data.gameId);
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      // Check authorization
      const participant = await this.gameRepository.findActiveGamesForUser(
        TelegramId.create(data.judgeTelegramId)
      );
      
      // Complete the game
      game.complete();
      await this.gameRepository.save(game);

      // Emit domain event
      const event = new GameCompletedEvent(
        game,
        data.judgeTelegramId,
        data.playerResults,
      );
      await this.eventBus.publish(event);

      this.logger.log(`Game completed: ${game.name} (${game.id.value})`);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to complete game: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
