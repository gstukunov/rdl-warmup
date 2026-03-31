/**
 * User Domain Entity
 * 
 * Represents a user in the debate system.
 * Pure domain entity - no database dependencies.
 */

import { UserId } from '../value-objects/user-id.vo';
import { TelegramId } from '../value-objects/telegram-id.vo';

export interface UserProps {
  id: UserId;
  telegramId: TelegramId;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  gamesPlayed: number;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  telegramId: TelegramId;
  username: string | null;
  firstName: string | null;
  lastName?: string | null;
}

export class User {
  private readonly _id: UserId;
  private readonly _telegramId: TelegramId;
  private _username: string | null;
  private _firstName: string | null;
  private _lastName: string | null;
  private _isActive: boolean;
  private _gamesPlayed: number;
  private _totalPoints: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._telegramId = props.telegramId;
    this._username = props.username;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._isActive = props.isActive;
    this._gamesPlayed = props.gamesPlayed;
    this._totalPoints = props.totalPoints;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new user
   */
  static create(props: CreateUserProps): User {
    const now = new Date();
    
    return new User({
      id: UserId.generate(),
      telegramId: props.telegramId,
      username: props.username,
      firstName: props.firstName,
      lastName: props.lastName ?? null,
      isActive: true,
      gamesPlayed: 0,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a user from database (no business rules)
   */
  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  // Getters
  get id(): UserId {
    return this._id;
  }

  get telegramId(): TelegramId {
    return this._telegramId;
  }

  get username(): string | null {
    return this._username;
  }

  get firstName(): string | null {
    return this._firstName;
  }

  get lastName(): string | null {
    return this._lastName;
  }

  get fullName(): string {
    const parts = [this._firstName, this._lastName].filter(Boolean);
    return parts.join(' ') || this._username || `User ${this._telegramId.value}`;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get gamesPlayed(): number {
    return this._gamesPlayed;
  }

  get totalPoints(): number {
    return this._totalPoints;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Domain methods
  updateProfile(props: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }): void {
    if (props.username !== undefined) this._username = props.username;
    if (props.firstName !== undefined) this._firstName = props.firstName;
    if (props.lastName !== undefined) this._lastName = props.lastName;
    this._updatedAt = new Date();
  }

  incrementGamesPlayed(): void {
    this._gamesPlayed++;
    this._updatedAt = new Date();
  }

  addPoints(points: number): void {
    if (points < 0) {
      throw new Error('Cannot add negative points');
    }
    this._totalPoints += points;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }
}
