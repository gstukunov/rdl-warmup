/**
 * Position Value Object
 * 
 * Represents a debate position in BP format.
 */

export class InvalidPositionError extends Error {
  constructor(position: string) {
    super(`Invalid position: ${position}`);
    this.name = 'InvalidPositionError';
  }
}

export enum DebatePosition {
  OPENING_GOVERNMENT = 'OG',
  OPENING_OPPOSITION = 'OO',
  CLOSING_GOVERNMENT = 'CG',
  CLOSING_OPPOSITION = 'CO',
}

export class Position {
  private readonly _value: DebatePosition;

  private constructor(value: DebatePosition) {
    this._value = value;
  }

  /**
   * Factory method that validates and creates a Position
   */
  static create(value: string): Position {
    const upperValue = value.toUpperCase();
    
    if (!Object.values(DebatePosition).includes(upperValue as DebatePosition)) {
      throw new InvalidPositionError(value);
    }

    return new Position(upperValue as DebatePosition);
  }

  /**
   * Creates from enum value directly
   */
  static fromEnum(position: DebatePosition): Position {
    return new Position(position);
  }

  /**
   * Creates from full name
   */
  static fromFullName(name: string): Position {
    const mapping: Record<string, DebatePosition> = {
      'opening_government': DebatePosition.OPENING_GOVERNMENT,
      'opening_opposition': DebatePosition.OPENING_OPPOSITION,
      'closing_government': DebatePosition.CLOSING_GOVERNMENT,
      'closing_opposition': DebatePosition.CLOSING_OPPOSITION,
    };

    const position = mapping[name.toLowerCase()];
    if (!position) {
      throw new InvalidPositionError(name);
    }

    return new Position(position);
  }

  get value(): DebatePosition {
    return this._value;
  }

  get fullName(): string {
    const mapping: Record<DebatePosition, string> = {
      [DebatePosition.OPENING_GOVERNMENT]: 'opening_government',
      [DebatePosition.OPENING_OPPOSITION]: 'opening_opposition',
      [DebatePosition.CLOSING_GOVERNMENT]: 'closing_government',
      [DebatePosition.CLOSING_OPPOSITION]: 'closing_opposition',
    };

    return mapping[this._value];
  }

  get displayName(): string {
    const mapping: Record<DebatePosition, string> = {
      [DebatePosition.OPENING_GOVERNMENT]: 'Opening Government (OG)',
      [DebatePosition.OPENING_OPPOSITION]: 'Opening Opposition (OO)',
      [DebatePosition.CLOSING_GOVERNMENT]: 'Closing Government (CG)',
      [DebatePosition.CLOSING_OPPOSITION]: 'Closing Opposition (CO)',
    };

    return mapping[this._value];
  }

  /**
   * Returns true if this is a government position
   */
  get isGovernment(): boolean {
    return this._value === DebatePosition.OPENING_GOVERNMENT || 
           this._value === DebatePosition.CLOSING_GOVERNMENT;
  }

  /**
   * Returns true if this is an opening position
   */
  get isOpening(): boolean {
    return this._value === DebatePosition.OPENING_GOVERNMENT || 
           this._value === DebatePosition.OPENING_OPPOSITION;
  }

  toString(): string {
    return this._value;
  }

  equals(other: Position): boolean {
    return this._value === other._value;
  }
}
