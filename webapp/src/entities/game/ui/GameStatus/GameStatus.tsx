import React from 'react';
import { GameStatus } from '../../model';
import { GAME_STATUS_CONFIG } from '../../model/constants';

interface GameStatusBadgeProps {
  status: GameStatus;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({ status }) => {
  const config = GAME_STATUS_CONFIG[status];

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
