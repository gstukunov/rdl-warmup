/**
 * User DTOs
 * 
 * Data Transfer Objects for user-related operations.
 */

import { User } from '../../domain/entities/user.entity';

export interface UserDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserProfileDto extends UserDto {
  averageSpeakerScore: number | null;
  judgeRating: {
    average: number;
    count: number;
  } | null;
}

/**
 * Maps a domain User entity to a UserDto
 */
export function mapUserToDto(user: User): UserDto {
  return {
    id: user.id.value,
    telegramId: user.telegramId.value,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
