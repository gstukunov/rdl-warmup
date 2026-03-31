/**
 * Get Game By ID Query
 * 
 * CQRS Query for fetching a single game.
 */

import { Injectable, Inject } from '@nestjs/common';
import type { Game } from '../../domain/entities/game.entity';
import type { IGameRepository } from '../../domain/repository-interfaces/game.repository';
import { GAME_REPOSITORY } from '../../domain/repository-interfaces/game.repository';
import { GameId } from '../../domain/value-objects/game-id.vo';

export interface GetGameByIdQueryData {
  gameId: string;
}

export interface GetGameByIdResult {
  success: boolean;
  game?: Game;
  error?: string;
}

@Injectable()
export class GetGameByIdQuery {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
  ) {}

  async execute(data: GetGameByIdQueryData): Promise<GetGameByIdResult> {
    try {
      const gameId = GameId.fromString(data.gameId);
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        return { success: false, error: 'Game not found' };
      }

      return { success: true, game };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
