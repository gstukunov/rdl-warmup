/**
 * Game Started Event
 * 
 * Emitted when a game starts (motion is set).
 */

import { DomainEvent } from './domain-event';
import { Game } from '../entities/game.entity';

export class GameStartedEvent extends DomainEvent {
  readonly eventType = 'game.started';
  readonly aggregateId: string;

  constructor(
    public readonly game: Game,
    public readonly startedByTelegramId: number,
  ) {
    super();
    this.aggregateId = game.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      gameId: this.game.id.value,
      name: this.game.name,
      motion: this.game.motion,
      startedByTelegramId: this.startedByTelegramId,
      startTime: this.game.startTime?.toISOString(),
    };
  }
}
