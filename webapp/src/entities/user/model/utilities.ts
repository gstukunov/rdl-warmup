import type { UserProfile } from './types';

/**
 * Format user display name from first/last name and username
 */
export const formatUserDisplayName = (
  firstName: string | null,
  lastName: string | null,
  username: string | null
): string => {
  let name = firstName || '';
  if (lastName) {
    name += ` ${lastName}`;
  }
  if (username) {
    name += ` (@${username})`;
  }
  return name.trim() || 'Unknown';
};

/**
 * Format user name with username only if no first name
 */
export const formatShortUserName = (
  firstName: string | null,
  username: string | null
): string => {
  return firstName || username || 'Unknown';
};

/**
 * Get full name from profile
 */
export const getFullName = (profile: UserProfile): string => {
  const { firstName, lastName, username } = profile.user;
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || username || 'User';
};

/**
 * Format average score to 1 decimal place
 */
export const formatAverageScore = (score: number): string => {
  return score.toFixed(1);
};

/**
 * Check if user has judge stats
 */
export const hasJudgeStats = (totalFeedbacks: number): boolean => {
  return totalFeedbacks > 0;
};
