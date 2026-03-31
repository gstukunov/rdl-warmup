/**
 * Score Value Object
 * 
 * Represents a debate score with validation and business rules.
 * Immutable - once created, cannot be modified.
 */

export class InvalidScoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScoreError';
  }
}

export interface ScoreRange {
  min: number;
  max: number;
}

export const DEFAULT_SCORE_RANGE: ScoreRange = { min: 0, max: 100 };

export class Score {
  private readonly _value: number;
  private readonly _range: ScoreRange;

  private constructor(value: number, range: ScoreRange = DEFAULT_SCORE_RANGE) {
    this._value = value;
    this._range = range;
  }

  /**
   * Factory method that validates and creates a Score
   */
  static create(value: number, range: ScoreRange = DEFAULT_SCORE_RANGE): Score {
    if (!Number.isFinite(value)) {
      throw new InvalidScoreError('Score must be a valid number');
    }

    if (!Number.isInteger(value)) {
      throw new InvalidScoreError('Score must be an integer');
    }

    if (value < range.min || value > range.max) {
      throw new InvalidScoreError(
        `Score must be between ${range.min} and ${range.max}`
      );
    }

    return new Score(value, range);

  }

  /**
   * Creates a Score without validation (for restoring from database)
   */
  static reconstitute(value: number, range: ScoreRange = DEFAULT_SCORE_RANGE): Score {
    return new Score(value, range);
  }

  get value(): number {
    return this._value;
  }

  get range(): ScoreRange {
    return { ...this._range };
  }

  /**
   * Compares two scores
   */
  isGreaterThan(other: Score): boolean {
    return this._value > other._value;
  }

  /**
   * Calculates average with other scores
   */
  static average(scores: Score[]): Score | null {
    if (scores.length === 0) return null;
    
    const sum = scores.reduce((acc, score) => acc + score._value, 0);
    const average = Math.round(sum / scores.length);
    
    return new Score(average, scores[0]?._range ?? DEFAULT_SCORE_RANGE);
  }

  /**
   * Returns the highest score from a list
   */
  static highest(scores: Score[]): Score | null {
    if (scores.length === 0) return null;
    
    const max = Math.max(...scores.map(s => s._value));
    return new Score(max, scores[0]._range);
  }

  toString(): string {
    return this._value.toString();
  }

  equals(other: Score): boolean {
    return this._value === other._value;
  }
}
