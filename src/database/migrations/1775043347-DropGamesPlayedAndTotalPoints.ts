import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropGamesPlayedAndTotalPoints1775042900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the deprecated columns from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "games_played"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "total_points"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns if needed for rollback
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "games_played" int NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "total_points" int NOT NULL DEFAULT 0`);
  }
}
