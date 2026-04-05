import React from 'react';
import { Card, CardContent } from '@/shared/ui';
import { GameStatusBadge, type Game } from '@/entities/game';
import { cn } from '@/shared/lib';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-opacity duration-100',
        onClick && 'hover:opacity-90 active:scale-[0.98]'
      )}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-2 truncate">{game.name}</h3>
            <p className="text-sm text-telegram-hint leading-relaxed line-clamp-2">
              {game.description || 'No description'}
            </p>
          </div>
          <GameStatusBadge status={game.status} />
        </div>
        
        <div className="mt-3 pt-3 border-t border-telegram-bg flex justify-between items-center">
          <span className="text-sm text-telegram-hint">
            👥 {game.participantCount}/{game.maxParticipants} participants
          </span>
          {game.isUserRegistered ? (
            <span className="text-sm font-semibold text-green-500">
              ✓ Joined
            </span>
          ) : (
            <span className="text-sm text-telegram-link">
              Join →
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
