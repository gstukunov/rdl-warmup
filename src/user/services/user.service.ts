import { Injectable, Inject } from '@nestjs/common';
import type { User } from '../entities/user.entity';
import type { IUserRepository } from '../repositories/user.repository.interface';
import { USER_REPOSITORY } from '../repositories/user.repository.interface';

export interface CreateUserData {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName?: string | null;
}

export interface UserStats {
  gamesPlayed: number;
  speakerScores: number[];
  totalPoints: number;
}

export interface UserProfile {
  user: User;
  averageSpeakerScore: string;
}

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findOrCreate(userData: CreateUserData): Promise<User> {
    let user = await this.userRepository.findByTelegramId(userData.telegramId);
    
    if (!user) {
      user = await this.userRepository.create({
        telegramId: userData.telegramId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName || null,
        gamesPlayed: 0,
        speakerScores: [],
        totalPoints: 0,
      });
    }
    
    return user;
  }

  async getByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepository.findByTelegramId(telegramId);
  }

  async getById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getAllUsersWithStats(): Promise<User[]> {
    return this.userRepository.findAllWithStats();
  }

  async updateUserStats(
    telegramId: number, 
    stats: Partial<UserStats>
  ): Promise<void> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      throw new Error(`User with telegramId ${telegramId} not found`);
    }

    if (stats.speakerScores) {
      user.speakerScores = [...(user.speakerScores || []), ...stats.speakerScores];
    }
    if (stats.gamesPlayed !== undefined) {
      user.gamesPlayed += stats.gamesPlayed;
    }
    if (stats.totalPoints !== undefined) {
      user.totalPoints += stats.totalPoints;
    }

    await this.userRepository.save(user);
  }

  async getUserProfile(telegramId: number): Promise<UserProfile | null> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    if (!user) {
      return null;
    }

    const averageSpeakerScore = this.calculateAverageScore(user.speakerScores);

    return {
      user,
      averageSpeakerScore,
    };
  }

  private calculateAverageScore(scores: number[]): string {
    if (!scores || scores.length === 0) {
      return '—';
    }
    const sum = scores.reduce((acc, score) => acc + score, 0);
    const average = sum / scores.length;
    return average.toFixed(1).replace('.', ',');
  }
}
