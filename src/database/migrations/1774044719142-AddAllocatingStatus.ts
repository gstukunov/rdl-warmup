import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllocatingStatus1774044719142 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'allocating' to the games_status_enum
    await queryRunner.query(`ALTER TYPE "games_status_enum" ADD VALUE 'allocating'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL, so this is a no-op
    console.log('Cannot remove enum values in PostgreSQL');
  }
}
