/**
 * Register User Command
 * 
 * CQRS Command for registering a new user or updating existing.
 */

import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repository-interfaces/user.repository';
import { USER_REPOSITORY } from '../../domain/repository-interfaces/user.repository';
import { TelegramId } from '../../domain/value-objects/telegram-id.vo';

export interface RegisterUserCommandData {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName?: string | null;
}

export interface RegisterUserResult {
  success: boolean;
  user: User;
  isNew: boolean;
  error?: string;
}

@Injectable()
export class RegisterUserCommand {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(data: RegisterUserCommandData): Promise<RegisterUserResult> {
    try {
      const telegramId = TelegramId.create(data.telegramId);

      // Check if user already exists
      const existingUser = await this.userRepository.findByTelegramId(telegramId);

      if (existingUser) {
        // Update profile if needed
        const hasChanges = 
          existingUser.username !== data.username ||
          existingUser.firstName !== data.firstName ||
          existingUser.lastName !== (data.lastName ?? null);

        if (hasChanges) {
          existingUser.updateProfile({
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
          });
          await this.userRepository.save(existingUser);
        }

        return { 
          success: true, 
          user: existingUser, 
          isNew: false 
        };
      }

      // Create new user
      const user = User.create({
        telegramId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      await this.userRepository.save(user);

      return { 
        success: true, 
        user, 
        isNew: true 
      };
    } catch (error) {
      return { 
        success: false, 
        user: null as unknown as User,
        isNew: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
