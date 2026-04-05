import React from 'react';
import { useTelegram } from '@/shared/telegram';
import { Card } from '@/shared/ui';
import { GameStatusBadge, type Game } from '@/entities/game';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const { theme } = useTelegram();

  return (
    <Card onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '17px' }}>{game.name}</h3>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: theme.hintColor,
              lineHeight: 1.4,
            }}
          >
            {game.description || 'No description'}
          </p>
        </div>
        <GameStatusBadge status={game.status} />
      </div>
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${theme.bgColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '14px', color: theme.hintColor }}>
          👥 {game.participantCount}/{game.maxParticipants} participants
        </span>
        {game.isUserRegistered ? (
          <span
            style={{
              fontSize: '13px',
              color: '#27ae60',
              fontWeight: 600,
            }}
          >
            ✓ Joined
          </span>
        ) : (
          <span style={{ fontSize: '13px', color: theme.linkColor }}>
            Join →
          </span>
        )}
      </div>
    </Card>
  );
};
