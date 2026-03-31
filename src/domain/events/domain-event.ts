/**
 * Domain Event Base Class
 * 
 * All domain events must extend this class.
 * Provides common properties for events.
 */

export abstract class DomainEvent {
  /**
   * Unique identifier for this event instance
   */
  readonly eventId: string;

  /**
   * When the event occurred
   */
  readonly occurredAt: Date;

  /**
   * The aggregate ID that triggered this event
   */
  abstract readonly aggregateId: string;

  /**
   * Event type/name for routing
   */
  abstract readonly eventType: string;

  /**
   * Event version for schema evolution
   */
  readonly version: number = 1;

  constructor() {
    this.eventId = this.generateId();
    this.occurredAt = new Date();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Serialize event to JSON for persistence/transport
   */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      version: this.version,
      payload: this.getPayload(),
    };
  }

  /**
   * Get the event payload (override in subclasses)
   */
  protected abstract getPayload(): Record<string, unknown>;
}

/**
 * Type guard for domain events
 */
export function isDomainEvent(event: unknown): event is DomainEvent {
  return event instanceof DomainEvent;
}
