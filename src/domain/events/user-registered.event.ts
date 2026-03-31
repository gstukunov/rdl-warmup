/**
 * User Registered Event
 * 
 * Emitted when a new user registers.
 */

import { DomainEvent } from './domain-event';
import { User } from '../entities/user.entity';

export class UserRegisteredEvent extends DomainEvent {
  readonly eventType = 'user.registered';
  readonly aggregateId: string;

  constructor(
    public readonly user: User,
  ) {
    super();
    this.aggregateId = user.id.value;
  }

  protected getPayload(): Record<string, unknown> {
    return {
      userId: this.user.id.value,
      telegramId: this.user.telegramId.value,
      username: this.user.username,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      fullName: this.user.fullName,
    };
  }
}
