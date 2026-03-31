/**
 * Get Open Games Query
 * 
 * CQRS Query for fetching games open for registration.
 */

import { Injectable, Inject } from '@nestjs/common';
import type { Game } from '../../domain/entities/game.entity';
import type { IGameRepository } from '../../domain/repository-interfaces/game.repository';
import { GAME_REPOSITORY } from '../../domain/repository-interfaces/game.repository';

export interface GetOpenGamesResult {
  success: boolean;
  games: Game[];
  error?: string;
}

@Injectable()
export class GetOpenGamesQuery {
  constructor(
    @Inject(GAME_REPOSITORY)
    private readonly gameRepository: IGameRepository,
  ) {}

  async execute(): Promise<GetOpenGamesResult> {
    try {
      const games = await this.gameRepository.findOpenForRegistration();

      return { success: true, games };
    } catch (error) {
      return { 
        success: false, 
        games: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
