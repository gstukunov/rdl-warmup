import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeedbackHiddenColumn1775063979000 implements MigrationInterface {
  name = 'AddIsFeedbackHiddenColumn1775063979000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "games" 
      ADD COLUMN "is_feedback_hidden" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_GAMES_IS_FEEDBACK_HIDDEN" ON "games" ("is_feedback_hidden")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_GAMES_IS_FEEDBACK_HIDDEN"`);
    await queryRunner.query(`ALTER TABLE "games" DROP COLUMN "is_feedback_hidden"`);
  }
}
