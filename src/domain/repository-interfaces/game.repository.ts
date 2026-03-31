/**
 * Game Repository Interface
 * 
 * Defines the contract for game persistence operations.
 * Part of the domain layer - implementation is in infrastructure.
 */

import { Game, GameStatus } from '../entities/game.entity';
import { GameId } from '../value-objects/game-id.vo';
import { TelegramId } from '../value-objects/telegram-id.vo';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface IGameRepository {
  /**
   * Find game by ID
   */
  findById(id: GameId): Promise<Game | null>;

  /**
   * Find games by status
   */
  findByStatus(status: GameStatus): Promise<Game[]>;

  /**
   * Find games open for registration
   */
  findOpenForRegistration(): Promise<Game[]>;

  /**
   * Find active games for a user (where they are participating)
   */
  findActiveGamesForUser(telegramId: TelegramId): Promise<Game[]>;

  /**
   * Find games created by a specific user
   */
  findByCreator(telegramId: TelegramId): Promise<Game[]>;

  /**
   * Save a game (create or update)
   */
  save(game: Game): Promise<void>;

  /**
   * Delete a game
   */
  delete(id: GameId): Promise<void>;

  /**
   * Check if game exists
   */
  exists(id: GameId): Promise<boolean>;
}
