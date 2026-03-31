/**
 * Scores Submitted Event
 * 
 * Emitted when a judge submits scores.
 */

import { DomainEvent } from './domain-event';
import { Game } from '../entities/game.entity';

export interface PositionScore {
  position: string; // 'opening_government', etc.
  score1: number;
  score2: number;
}

export class ScoresSubmittedEvent extends DomainEvent {
  readonly eventType = 'scores.submitted';
  readonly aggregateId: string;

  constructor(
    public readonly game: Game,
    public readonly judgeTelegramId: number,
    public readonly positionScores: PositionScore[],
  ) {
    super();
    this.aggregateId = game.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      gameId: this.game.id.value,
      judgeTelegramId: this.judgeTelegramId,
      positionScores: this.positionScores,
      submittedAt: this.occurredAt.toISOString(),
    };
  }
}
