/**
 * Game Completed Event
 * 
 * Emitted when a game is completed.
 */

import { DomainEvent } from './domain-event';
import { Game } from '../entities/game.entity';

export interface PlayerResult {
  telegramId: number;
  position: string;
  averageScore: number;
}

export class GameCompletedEvent extends DomainEvent {
  readonly eventType = 'game.completed';
  readonly aggregateId: string;

  constructor(
    public readonly game: Game,
    public readonly completedByTelegramId: number,
    public readonly playerResults: PlayerResult[],
  ) {
    super();
    this.aggregateId = game.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      gameId: this.game.id.value,
      name: this.game.name,
      motion: this.game.motion,
      completedByTelegramId: this.completedByTelegramId,
      startTime: this.game.startTime?.toISOString(),
      endTime: this.game.endTime?.toISOString(),
      playerResults: this.playerResults,
    };
  }
}
