/**
 * Create Game with Events Command
 * 
 * Demonstrates how to emit domain events.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity';
import type { IGameRepository } from '../../domain/repository-interfaces/game.repository';
import { GAME_REPOSITORY } from '../../domain/repository-interfaces/game.repository';
import type { IEventBus } from '../ports/event-bus.port';
import { EVENT_BUS } from '../ports/event-bus.port';
import { GameCreatedEvent } from '../../domain/events/game-created.event';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo';

export interface CreateGameWithEventsData {
  name: string;
  description?: string | null;
  maxParticipants?: number;
  creatorTelegramId: number;
}

export interface CreateGameWithEventsResult {
  success: boolean;
  game?: Game;
  error?: string;
}

@Injectable()
export class CreateGameWithEventsCommand {
  private readonly logger = new Logger(CreateGameWithEventsCommand.name);

  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(data: CreateGameWithEventsData): Promise<CreateGameWithEventsResult> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        return { success: false, error: 'Game name is required' };
      }

      if (data.maxParticipants && (data.maxParticipants < 2 || data.maxParticipants > 16)) {
        return { success: false, error: 'Max participants must be between 2 and 16' };
      }

      // Create domain entity
      const game = Game.create({
        name: data.name.trim(),
        description: data.description,
        maxParticipants: data.maxParticipants,
        createdByTelegramId: TelegramId.create(data.creatorTelegramId),
      });

      // Persist
      await this.gameRepository.save(game);

      // Emit domain event
      const event = new GameCreatedEvent(game, data.creatorTelegramId);
      await this.eventBus.publish(event);

      this.logger.log(`Game created: ${game.name} (${game.id.value})`);

      return { success: true, game };
    } catch (error) {
      this.logger.error(
        `Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
