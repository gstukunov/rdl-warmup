import { GameStatus, ParticipantRole, Position } from './types';

// Game status display configuration
export const GAME_STATUS_CONFIG: Record<
  GameStatus,
  { label: string; color: string; bgColor: string }
> = {
  [GameStatus.REGISTRATION]: {
    label: '📝 Registration',
    color: '#27ae60',
    bgColor: 'rgba(39, 174, 96, 0.15)',
  },
  [GameStatus.ALLOCATING]: {
    label: '🎲 Allocating',
    color: '#f39c12',
    bgColor: 'rgba(243, 156, 18, 0.15)',
  },
  [GameStatus.IN_PROGRESS]: {
    label: '🔥 In Progress',
    color: '#e74c3c',
    bgColor: 'rgba(231, 76, 60, 0.15)',
  },
  [GameStatus.COMPLETED]: {
    label: '✅ Completed',
    color: '#7f8c8d',
    bgColor: 'rgba(127, 140, 141, 0.15)',
  },
  [GameStatus.CANCELLED]: {
    label: '❌ Cancelled',
    color: '#95a5a6',
    bgColor: 'rgba(149, 165, 166, 0.15)',
  },
};

// Role display configuration
export const ROLE_CONFIG: Record<
  ParticipantRole,
  { label: string; icon: string }
> = {
  [ParticipantRole.PLAYER]: { label: 'Player', icon: '🎤' },
  [ParticipantRole.JUDGE]: { label: 'Judge', icon: '⚖️' },
  [ParticipantRole.WING]: { label: 'Wing', icon: '🪶' },
};

// Position display configuration
export const POSITION_CONFIG: Record<Position, { short: string; full: string }> = {
  [Position.OPENING_GOVERNMENT]: { short: 'OG', full: 'Opening Government' },
  [Position.OPENING_OPPOSITION]: { short: 'OO', full: 'Opening Opposition' },
  [Position.CLOSING_GOVERNMENT]: { short: 'CG', full: 'Closing Government' },
  [Position.CLOSING_OPPOSITION]: { short: 'CO', full: 'Closing Opposition' },
  [Position.NONE]: { short: '', full: 'None' },
};
