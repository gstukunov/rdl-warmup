import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceGamesWonWithSpeakerScores1774044719139 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove games_won column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "games_won"`);
    
    // Add speaker_scores column as jsonb array
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "speaker_scores" jsonb NOT NULL DEFAULT '[]'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove speaker_scores column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "speaker_scores"`);
    
    // Add back games_won column
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "games_won" int NOT NULL DEFAULT 0`);
  }
}
