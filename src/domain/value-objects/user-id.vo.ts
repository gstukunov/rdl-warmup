/**
 * UserId Value Object
 * 
 * Represents a unique identifier for a user.
 */

import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export class InvalidUserIdError extends Error {
  constructor(id: string) {
    super(`Invalid user ID: ${id}`);
    this.name = 'InvalidUserIdError';
  }
}

export class UserId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Creates a new random UserId
   */
  static generate(): UserId {
    return new UserId(uuidv4());
  }

  /**
   * Creates from existing UUID string
   */
  static fromString(value: string): UserId {
    if (!validateUuid(value)) {
      throw new InvalidUserIdError(value);
    }
    return new UserId(value);
  }

  /**
   * Creates without validation (for database reconstitution)
   */
  static reconstitute(value: string): UserId {
    return new UserId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
