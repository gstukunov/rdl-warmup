/**
 * TelegramId Value Object
 * 
 * Represents a Telegram user ID with validation.
 */

export class InvalidTelegramIdError extends Error {
  constructor(id: number) {
    super(`Invalid Telegram ID: ${id}`);
    this.name = 'InvalidTelegramIdError';
  }
}

export class TelegramId {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  /**
   * Creates a TelegramId with validation
   */
  static create(value: number): TelegramId {
    // Telegram IDs are positive integers (except for bot test IDs which can be negative)
    if (!Number.isInteger(value)) {
      throw new InvalidTelegramIdError(value);
    }

    return new TelegramId(value);
  }

  /**
   * Creates without validation (for database reconstitution)
   */
  static reconstitute(value: number): TelegramId {
    return new TelegramId(value);
  }

  get value(): number {
    return this._value;
  }

  /**
   * Returns true if this is a bot ID (negative)
   */
  get isBot(): boolean {
    return this._value < 0;
  }

  equals(other: TelegramId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }
}
