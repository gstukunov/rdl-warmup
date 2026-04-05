import React from 'react';
import { Badge } from '@/shared/ui';
import { GameStatus } from '../../model';
import { GAME_STATUS_CONFIG } from '../../model/constants';

interface GameStatusBadgeProps {
  status: GameStatus;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({ status }) => {
  const config = GAME_STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className="font-semibold text-xs px-3 py-1 rounded-full whitespace-nowrap"
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        borderColor: config.bgColor,
      }}
    >
      {config.label}
    </Badge>
  );
};
