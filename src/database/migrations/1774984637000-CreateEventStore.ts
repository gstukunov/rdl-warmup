import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEventStore1774984637000 implements MigrationInterface {
  name = 'CreateEventStore1774984637000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'domain_events',
        columns: [
          {
            name: 'event_id',
            type: 'varchar',
            length: '64',
            isPrimary: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
          },
          {
            name: 'occurred_at',
            type: 'timestamp',
          },
          {
            name: 'version',
            type: 'int',
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'sequence_number',
            type: 'bigint',
            isUnique: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'idx_domain_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'idx_domain_events_aggregate_id',
        columnNames: ['aggregate_id'],
      }),
    );

    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'idx_domain_events_occurred_at',
        columnNames: ['occurred_at'],
      }),
    );

    await queryRunner.createIndex(
      'domain_events',
      new TableIndex({
        name: 'idx_domain_events_sequence_number',
        columnNames: ['sequence_number'],
      }),
    );

    // Create sequence for sequence_number
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS domain_events_seq START 1;
    `);

    // Create trigger to auto-populate sequence_number
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_domain_events_sequence()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.sequence_number = nextval('domain_events_seq');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_set_domain_events_sequence
      BEFORE INSERT ON domain_events
      FOR EACH ROW
      EXECUTE FUNCTION set_domain_events_sequence();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_set_domain_events_sequence ON domain_events;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_domain_events_sequence();`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS domain_events_seq;`);
    await queryRunner.dropTable('domain_events', true);
  }
}
