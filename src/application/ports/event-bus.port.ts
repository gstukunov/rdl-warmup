/**
 * Event Bus Port
 * 
 * Interface for the event bus - part of the application layer.
 * Infrastructure provides the actual implementation.
 */

import { DomainEvent } from '../../domain/events/domain-event';

export const EVENT_BUS = Symbol('EVENT_BUS');

/**
 * Handler function type for events
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Event Bus Interface
 * 
 * Provides publish/subscribe functionality for domain events.
 */
export interface IEventBus {
  /**
   * Publish a single event
   */
  publish<T extends DomainEvent>(event: T): Promise<void>;

  /**
   * Publish multiple events
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to a specific event type
   * 
   * @param eventType - The event type to subscribe to
   * @param handler - The handler function
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): void;

  /**
   * Subscribe to multiple event types with the same handler
   */
  subscribeMany<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>,
  ): void;
}

/**
 * Event Store Interface
 * 
 * For persisting events (optional, for event sourcing).
 */
export interface IEventStore {
  /**
   * Append events to the store
   */
  append(events: DomainEvent[]): Promise<void>;

  /**
   * Get events for a specific aggregate
   */
  getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]>;

  /**
   * Get all events after a specific version/checkpoint
   */
  getEventsAfter(version: number, limit?: number): Promise<DomainEvent[]>;
}

export const EVENT_STORE = Symbol('EVENT_STORE');
