/**
 * Game Allocated Event
 * 
 * Emitted when players are allocated to rooms/positions.
 */

import { DomainEvent } from './domain-event';
import { Game } from '../entities/game.entity';

export interface AllocatedPlayer {
  telegramId: number;
  position: string;
  isIronman: boolean;
}

export interface AllocatedRoom {
  roomNumber: number;
  players: AllocatedPlayer[];
  judges: number[]; // telegram IDs
  wings: number[]; // telegram IDs
}

export class GameAllocatedEvent extends DomainEvent {
  readonly eventType = 'game.allocated';
  readonly aggregateId: string;

  constructor(
    public readonly game: Game,
    public readonly rooms: AllocatedRoom[],
    public readonly allocatedByTelegramId: number,
  ) {
    super();
    this.aggregateId = game.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      gameId: this.game.id.value,
      name: this.game.name,
      rooms: this.rooms,
      allocatedByTelegramId: this.allocatedByTelegramId,
    };
  }
}
