import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AlterGameParticipantsForTelegram1774044719140 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add telegram_id column for telegram bot integration
    await queryRunner.addColumn(
      'game_participants',
      new TableColumn({
        name: 'telegram_id',
        type: 'bigint',
        isNullable: true,
      }),
    );

    // Add username column
    await queryRunner.addColumn(
      'game_participants',
      new TableColumn({
        name: 'username',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add first_name column
    await queryRunner.addColumn(
      'game_participants',
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add index on telegram_id for faster lookups
    await queryRunner.createIndex(
      'game_participants',
      new TableIndex({
        name: 'IDX_GAME_PARTICIPANTS_TELEGRAM_ID',
        columnNames: ['telegram_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('game_participants', 'IDX_GAME_PARTICIPANTS_TELEGRAM_ID');
    await queryRunner.dropColumn('game_participants', 'first_name');
    await queryRunner.dropColumn('game_participants', 'username');
    await queryRunner.dropColumn('game_participants', 'telegram_id');
  }
}
