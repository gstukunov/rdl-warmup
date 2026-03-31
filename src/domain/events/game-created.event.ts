/**
 * Game Created Event
 * 
 * Emitted when a new game is created.
 */

import { DomainEvent } from './domain-event';
import { Game } from '../entities/game.entity';

export class GameCreatedEvent extends DomainEvent {
  readonly eventType = 'game.created';
  readonly aggregateId: string;

  constructor(
    public readonly game: Game,
    public readonly creatorTelegramId: number,
  ) {
    super();
    this.aggregateId = game.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      gameId: this.game.id.value,
      name: this.game.name,
      description: this.game.description,
      maxParticipants: this.game.maxParticipants,
      creatorTelegramId: this.creatorTelegramId,
    };
  }
}
