/**
 * Game Domain Entity
 * 
 * Represents a debate game with its lifecycle and rules.
 * Pure domain entity - no database dependencies.
 */

import { GameId } from '../value-objects/game-id.vo';
import { TelegramId } from '../value-objects/telegram-id.vo';
import { Score } from '../value-objects/score.vo';

export enum GameStatus {
  REGISTRATION = 'registration',
  ALLOCATING = 'allocating',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface GameProps {
  id: GameId;
  name: string;
  description: string | null;
  status: GameStatus;
  maxParticipants: number;
  createdByTelegramId: TelegramId | null;
  isAllocated: boolean;
  motion: string | null;
  startTime: Date | null;
  endTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGameProps {
  name: string;
  description?: string | null;
  maxParticipants?: number;
  createdByTelegramId: TelegramId;
}

export class Game {
  private readonly _id: GameId;
  private _name: string;
  private _description: string | null;
  private _status: GameStatus;
  private _maxParticipants: number;
  private readonly _createdByTelegramId: TelegramId | null;
  private _isAllocated: boolean;
  private _motion: string | null;
  private _startTime: Date | null;
  private _endTime: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: GameProps) {
    this._id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._status = props.status;
    this._maxParticipants = props.maxParticipants;
    this._createdByTelegramId = props.createdByTelegramId;
    this._isAllocated = props.isAllocated;
    this._motion = props.motion;
    this._startTime = props.startTime;
    this._endTime = props.endTime;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new game
   */
  static create(props: CreateGameProps): Game {
    const now = new Date();
    
    return new Game({
      id: GameId.generate(),
      name: props.name,
      description: props.description ?? null,
      status: GameStatus.REGISTRATION,
      maxParticipants: props.maxParticipants ?? 8,
      createdByTelegramId: props.createdByTelegramId,
      isAllocated: false,
      motion: null,
      startTime: null,
      endTime: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a game from database
   */
  static reconstitute(props: GameProps): Game {
    return new Game(props);
  }

  // Getters
  get id(): GameId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get status(): GameStatus {
    return this._status;
  }

  get maxParticipants(): number {
    return this._maxParticipants;
  }

  get createdByTelegramId(): TelegramId | null {
    return this._createdByTelegramId;
  }

  get isAllocated(): boolean {
    return this._isAllocated;
  }

  get motion(): string | null {
    return this._motion;
  }

  get startTime(): Date | null {
    return this._startTime ? new Date(this._startTime) : null;
  }

  get endTime(): Date | null {
    return this._endTime ? new Date(this._endTime) : null;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Domain methods
  canRegister(): boolean {
    return this._status === GameStatus.REGISTRATION;
  }

  canAllocate(): boolean {
    return this._status === GameStatus.REGISTRATION;
  }

  canStart(): boolean {
    return this._status === GameStatus.ALLOCATING;
  }

  canComplete(): boolean {
    return this._status === GameStatus.IN_PROGRESS;
  }

  canCancel(requesterTelegramId: TelegramId): boolean {
    if (
      this._status !== GameStatus.REGISTRATION &&
      this._status !== GameStatus.ALLOCATING
    ) {
      return false;
    }
    
    if (!this._createdByTelegramId) {
      return false;
    }
    
    return this._createdByTelegramId.equals(requesterTelegramId);
  }

  allocate(): void {
    if (!this.canAllocate()) {
      throw new Error(`Cannot allocate game in status: ${this._status}`);
    }
    
    this._isAllocated = true;
    this._status = GameStatus.ALLOCATING;
    this._updatedAt = new Date();
  }

  start(motion: string): void {
    if (!this.canStart()) {
      throw new Error(`Cannot start game in status: ${this._status}`);
    }
    
    if (!motion || motion.trim().length === 0) {
      throw new Error('Motion is required to start the game');
    }
    
    this._motion = motion.trim();
    this._status = GameStatus.IN_PROGRESS;
    this._startTime = new Date();
    this._updatedAt = new Date();
  }

  complete(): void {
    if (!this.canComplete()) {
      throw new Error(`Cannot complete game in status: ${this._status}`);
    }
    
    this._status = GameStatus.COMPLETED;
    this._endTime = new Date();
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (
      this._status !== GameStatus.REGISTRATION &&
      this._status !== GameStatus.ALLOCATING
    ) {
      throw new Error(`Cannot cancel game in status: ${this._status}`);
    }
    
    this._status = GameStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  updateDetails(props: {
    name?: string;
    description?: string | null;
  }): void {
    if (this._status !== GameStatus.REGISTRATION) {
      throw new Error('Can only update details during registration');
    }
    
    if (props.name !== undefined) {
      if (props.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      this._name = props.name.trim();
    }
    
    if (props.description !== undefined) {
      this._description = props.description;
    }
    
    this._updatedAt = new Date();
  }
}
