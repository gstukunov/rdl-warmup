/**
 * User Repository Interface
 * 
 * Defines the contract for user persistence operations.
 * Part of the domain layer - implementation is in infrastructure.
 */

import { User } from '../entities/user.entity';
import { UserId } from '../value-objects/user-id.vo';
import { TelegramId } from '../value-objects/telegram-id.vo';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: UserId): Promise<User | null>;

  /**
   * Find user by Telegram ID
   */
  findByTelegramId(telegramId: TelegramId): Promise<User | null>;

  /**
   * Find all users
   */
  findAll(): Promise<User[]>;

  /**
   * Find users ordered by total points (for leaderboard)
   */
  findAllOrderedByPoints(): Promise<User[]>;

  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<void>;

  /**
   * Delete a user
   */
  delete(id: UserId): Promise<void>;

  /**
   * Check if user exists by Telegram ID
   */
  existsByTelegramId(telegramId: TelegramId): Promise<boolean>;
}
