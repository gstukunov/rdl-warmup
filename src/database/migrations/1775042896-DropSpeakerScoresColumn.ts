import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSpeakerScoresColumn1775042877000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the deprecated speaker_scores column from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "speaker_scores"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the speaker_scores column if needed for rollback
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "speaker_scores" jsonb NOT NULL DEFAULT '[]'`);
  }
}
