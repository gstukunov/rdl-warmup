/**
 * Create Game Command
 * 
 * CQRS Command for creating a new game.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity';
import type { IGameRepository } from '../../domain/repository-interfaces/game.repository';
import { GAME_REPOSITORY } from '../../domain/repository-interfaces/game.repository';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo';

export interface CreateGameCommandData {
  name: string;
  description?: string | null;
  maxParticipants?: number;
  creatorTelegramId: number;
}

export interface CreateGameResult {
  success: boolean;
  game?: Game;
  error?: string;
}

@Injectable()
export class CreateGameCommand {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
  ) {}

  async execute(data: CreateGameCommandData): Promise<CreateGameResult> {
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

      return { success: true, game };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
