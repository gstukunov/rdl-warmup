import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserStatsColumns1774044719138 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'games_played',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'games_won',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'total_points',
        type: 'int',
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'total_points');
    await queryRunner.dropColumn('users', 'games_won');
    await queryRunner.dropColumn('users', 'games_played');
  }
}
