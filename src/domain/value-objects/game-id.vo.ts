/**
 * GameId Value Object
 * 
 * Represents a unique identifier for a game.
 */

import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export class InvalidGameIdError extends Error {
  constructor(id: string) {
    super(`Invalid game ID: ${id}`);
    this.name = 'InvalidGameIdError';
  }
}

export class GameId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates a new random GameId
   */
  static generate(): GameId {
    return new GameId(uuidv4());
  }

  /**
   * Creates from existing UUID string
   */
  static fromString(value: string): GameId {
    if (!validateUuid(value)) {
      throw new InvalidGameIdError(value);
    }
    return new GameId(value);
  }

  /**
   * Creates without validation (for database reconstitution)
   */
  static reconstitute(value: string): GameId {
    return new GameId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: GameId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
