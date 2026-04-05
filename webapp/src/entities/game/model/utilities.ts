import { ParticipantRole, Position } from './types';
import { ROLE_CONFIG, POSITION_CONFIG } from './constants';

/**
 * Get display icon for a participant role
 */
export const getRoleIcon = (role: ParticipantRole | string): string => {
  return ROLE_CONFIG[role as ParticipantRole]?.icon || '👤';
};

/**
 * Get display label for a participant role
 */
export const getRoleLabel = (role: ParticipantRole | string): string => {
  return ROLE_CONFIG[role as ParticipantRole]?.label || String(role);
};

/**
 * Get short abbreviation for a position (e.g., "OG" for Opening Government)
 */
export const getPositionShort = (position: Position | string): string => {
  return POSITION_CONFIG[position as Position]?.short || '';
};

/**
 * Get full display name for a position
 */
export const getPositionFull = (position: Position | string): string => {
  return POSITION_CONFIG[position as Position]?.full || String(position);
};

/**
 * Format participant name from available fields
 */
export const formatParticipantName = (
  firstName: string | null,
  lastName: string | null,
  username: string | null
): string => {
  if (firstName) {
    return lastName ? `${firstName} ${lastName}` : firstName;
  }
  if (username) {
    return `@${username}`;
  }
  return 'Anonymous';
};

/**
 * Check if a game status allows registration
 */
export const isRegistrationOpen = (status: string): boolean => {
  return status === 'registration';
};

/**
 * Check if a game is active (not completed or cancelled)
 */
export const isGameActive = (status: string): boolean => {
  return !['completed', 'cancelled'].includes(status);
};
