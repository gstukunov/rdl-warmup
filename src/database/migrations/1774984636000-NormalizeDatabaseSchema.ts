import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class NormalizeDatabaseSchema1774984636000 implements MigrationInterface {
  name = 'NormalizeDatabaseSchema1774984636000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to games table
    await queryRunner.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 8,
      ADD COLUMN IF NOT EXISTS created_by_telegram_id bigint,
      ADD COLUMN IF NOT EXISTS is_allocated boolean DEFAULT false;
    `);

    // Migrate data from settings JSONB to new columns
    await queryRunner.query(`
      UPDATE games 
      SET 
        max_participants = COALESCE((settings->>'maxParticipants')::integer, 8),
        created_by_telegram_id = (settings->>'createdByTelegramId')::bigint,
        is_allocated = COALESCE((settings->>'isAllocated')::boolean, false)
      WHERE settings IS NOT NULL;
    `);

    // Create room_allocations table
    await queryRunner.createTable(
      new Table({
        name: 'room_allocations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'game_id',
            type: 'uuid',
          },
          {
            name: 'room_number',
            type: 'smallint',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to room_allocations
    await queryRunner.createForeignKey(
      'room_allocations',
      new TableForeignKey({
        columnNames: ['game_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'games',
        onDelete: 'CASCADE',
      }),
    );

    // Create room_participants table
    await queryRunner.createTable(
      new Table({
        name: 'room_participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'room_id',
            type: 'uuid',
          },
          {
            name: 'participant_id',
            type: 'uuid',
          },
          {
            name: 'position',
            type: 'enum',
            enum: ['OG', 'OO', 'CG', 'CO'],
          },
          {
            name: 'is_ironman',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    // Add foreign keys to room_participants
    await queryRunner.createForeignKey(
      'room_participants',
      new TableForeignKey({
        columnNames: ['room_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'room_allocations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'room_participants',
      new TableForeignKey({
        columnNames: ['participant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'game_participants',
        onDelete: 'CASCADE',
      }),
    );

    // Create room_judges table
    await queryRunner.createTable(
      new Table({
        name: 'room_judges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'room_id',
            type: 'uuid',
          },
          {
            name: 'participant_id',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['chair', 'wing'],
            default: "'wing'",
          },
        ],
      }),
      true,
    );

    // Add foreign keys to room_judges
    await queryRunner.createForeignKey(
      'room_judges',
      new TableForeignKey({
        columnNames: ['room_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'room_allocations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'room_judges',
      new TableForeignKey({
        columnNames: ['participant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'game_participants',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'room_allocations',
      new TableIndex({
        columnNames: ['game_id'],
      }),
    );

    await queryRunner.createIndex(
      'room_participants',
      new TableIndex({
        columnNames: ['room_id'],
      }),
    );

    await queryRunner.createIndex(
      'room_participants',
      new TableIndex({
        columnNames: ['participant_id'],
      }),
    );

    await queryRunner.createIndex(
      'room_judges',
      new TableIndex({
        columnNames: ['room_id'],
      }),
    );

    await queryRunner.createIndex(
      'room_judges',
      new TableIndex({
        columnNames: ['participant_id'],
      }),
    );

    await queryRunner.createIndex(
      'games',
      new TableIndex({
        columnNames: ['created_by_telegram_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const roomJudgesTable = await queryRunner.getTable('room_judges');
    if (roomJudgesTable) {
      const foreignKeys = roomJudgesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('room_judges', fk);
      }
    }

    const roomParticipantsTable = await queryRunner.getTable('room_participants');
    if (roomParticipantsTable) {
      const foreignKeys = roomParticipantsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('room_participants', fk);
      }
    }

    const roomAllocationsTable = await queryRunner.getTable('room_allocations');
    if (roomAllocationsTable) {
      const foreignKeys = roomAllocationsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('room_allocations', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('room_judges', true);
    await queryRunner.dropTable('room_participants', true);
    await queryRunner.dropTable('room_allocations', true);

    // Restore data to settings JSONB (optional, but good for rollback)
    await queryRunner.query(`
      UPDATE games 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'),
        '{maxParticipants}',
        to_jsonb(max_participants)
      );
    `);

    await queryRunner.query(`
      UPDATE games 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'),
        '{isAllocated}',
        to_jsonb(is_allocated)
      );
    `);

    await queryRunner.query(`
      UPDATE games 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'),
        '{createdByTelegramId}',
        to_jsonb(created_by_telegram_id)
      )
      WHERE created_by_telegram_id IS NOT NULL;
    `);

    // Drop columns from games table
    await queryRunner.query(`
      ALTER TABLE games 
      DROP COLUMN IF EXISTS max_participants,
      DROP COLUMN IF EXISTS created_by_telegram_id,
      DROP COLUMN IF EXISTS is_allocated;
    `);
  }
}
