import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSpeakerScoresTable1774044719141 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'speaker_scores',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'game_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'telegram_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'score',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'is_ironman',
            type: 'boolean',
            default: false,
          },
          {
            name: 'judge_telegram_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'submitted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        uniques: [
          {
            name: 'UQ_SPEAKER_SCORE_GAME_TELEGRAM_POSITION',
            columnNames: ['game_id', 'telegram_id', 'position'],
          },
        ],
      }),
      true,
    );

    // Add foreign key to games table
    await queryRunner.createForeignKey(
      'speaker_scores',
      new TableForeignKey({
        name: 'FK_SPEAKER_SCORES_GAME',
        columnNames: ['game_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'games',
        onDelete: 'CASCADE',
      }),
    );

    // Add index on telegram_id for faster lookups
    await queryRunner.createIndex(
      'speaker_scores',
      new TableIndex({
        name: 'IDX_SPEAKER_SCORES_TELEGRAM_ID',
        columnNames: ['telegram_id'],
      }),
    );

    // Add index on game_id for faster lookups
    await queryRunner.createIndex(
      'speaker_scores',
      new TableIndex({
        name: 'IDX_SPEAKER_SCORES_GAME_ID',
        columnNames: ['game_id'],
      }),
    );

    // Add index on judge_telegram_id for faster lookups
    await queryRunner.createIndex(
      'speaker_scores',
      new TableIndex({
        name: 'IDX_SPEAKER_SCORES_JUDGE_ID',
        columnNames: ['judge_telegram_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('speaker_scores');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.name === 'FK_SPEAKER_SCORES_GAME',
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('speaker_scores', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('speaker_scores', 'IDX_SPEAKER_SCORES_TELEGRAM_ID');
    await queryRunner.dropIndex('speaker_scores', 'IDX_SPEAKER_SCORES_GAME_ID');
    await queryRunner.dropIndex('speaker_scores', 'IDX_SPEAKER_SCORES_JUDGE_ID');

    // Drop unique constraint
    await queryRunner.dropUniqueConstraint('speaker_scores', 'UQ_SPEAKER_SCORE_GAME_TELEGRAM_POSITION');

    // Drop table
    await queryRunner.dropTable('speaker_scores');
  }
}
