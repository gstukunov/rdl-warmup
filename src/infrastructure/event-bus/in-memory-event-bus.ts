/**
 * In-Memory Event Bus
 * 
 * Simple in-memory implementation of the event bus.
 * Can be replaced with Redis, RabbitMQ, or other message queues.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IEventBus, EventHandler } from '../../application/ports/event-bus.port';
import { DomainEvent } from '../../domain/events/domain-event';

@Injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    this.logger.debug(`Publishing event: ${event.eventType}`);

    const handlers = this.handlers.get(event.eventType) || [];
    
    if (handlers.length === 0) {
      this.logger.warn(`No handlers registered for event: ${event.eventType}`);
      return;
    }

    // Execute all handlers concurrently
    const promises = handlers.map(async (handler, index) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Handler ${index} failed for event ${event.eventType}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          error instanceof Error ? error.stack : undefined,
        );
        // Continue with other handlers even if one fails
      }
    });

    await Promise.all(promises);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    // Publish events sequentially to maintain order
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): void {
    this.logger.log(`Subscribing handler to event: ${eventType}`);

    const existingHandlers = this.handlers.get(eventType) || [];
    existingHandlers.push(handler as EventHandler);
    this.handlers.set(eventType, existingHandlers);
  }

  subscribeMany<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>,
  ): void {
    for (const eventType of eventTypes) {
      this.subscribe(eventType, handler);
    }
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get registered event types (useful for debugging)
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
