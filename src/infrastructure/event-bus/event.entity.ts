/**
 * Event Store Entity
 * 
 * Database entity for persisting domain events.
 */

import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('domain_events')
export class EventEntity {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 64 })
  eventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index()
  eventType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  @Index()
  aggregateId: string;

  @Column({ name: 'occurred_at', type: 'timestamp' })
  @Index()
  occurredAt: Date;

  @Column({ name: 'version', type: 'int' })
  version: number;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'sequence_number', type: 'bigint' })
  @Index()
  sequenceNumber: number;
}
