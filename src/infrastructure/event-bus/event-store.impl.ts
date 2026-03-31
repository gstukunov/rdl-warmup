/**
 * Event Store Implementation
 * 
 * Persists domain events to the database for event sourcing.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IEventStore } from '../../application/ports/event-bus.port';
import { DomainEvent } from '../../domain/events/domain-event';
import { EventEntity } from './event.entity';

@Injectable()
export class EventStoreImpl implements IEventStore {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repository: Repository<EventEntity>,
  ) {}

  async append(events: DomainEvent[]): Promise<void> {
    const entities = events.map((event, index) => {
      const entity = new EventEntity();
      entity.eventId = event.eventId;
      entity.eventType = event.eventType;
      entity.aggregateId = event.aggregateId;
      entity.occurredAt = event.occurredAt;
      entity.version = event.version;
      entity.payload = event.toJSON().payload as Record<string, unknown>;
      entity.sequenceNumber = index; // This should be globally unique in production
      
      return entity;
    });

    await this.repository.save(entities);
  }

  async getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]> {
    const entities = await this.repository.find({
      where: { aggregateId },
      order: { occurredAt: 'ASC', sequenceNumber: 'ASC' },
    });

    // Note: In a real implementation, we'd need to reconstruct the DomainEvent
    // from the stored data. This is simplified for demonstration.
    return entities.map(this.reconstructEvent);
  }

  async getEventsAfter(version: number, limit: number = 100): Promise<DomainEvent[]> {
    const entities = await this.repository.find({
      where: {},
      order: { sequenceNumber: 'ASC' },
      skip: version,
      take: limit,
    });

    return entities.map(this.reconstructEvent);
  }

  private reconstructEvent(entity: EventEntity): DomainEvent {
    // This is a simplified reconstruction
    // In production, you'd have a registry of event types and their constructors
    throw new Error('Event reconstruction not implemented - use event type registry');
  }
}
