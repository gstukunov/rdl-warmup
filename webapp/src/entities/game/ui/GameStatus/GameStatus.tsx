import React from 'react';
import { GameStatus } from '../../model';

interface GameStatusBadgeProps {
  status: GameStatus;
}

const statusConfig: Record<GameStatus, { label: string; color: string; bgColor: string }> = {
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

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    color: config.color,
    backgroundColor: config.bgColor,
    whiteSpace: 'nowrap',
  };

  return <span style={style}>{config.label}</span>;
};
