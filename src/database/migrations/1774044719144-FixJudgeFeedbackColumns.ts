import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixJudgeFeedbackColumns1774044719144 implements MigrationInterface {
  name = 'FixJudgeFeedbackColumns1774044719144';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename comment to feedback
    await queryRunner.query(`
      ALTER TABLE "judge_feedback" RENAME COLUMN "comment" TO "feedback"
    `);

    // Rename created_at to submitted_at
    await queryRunner.query(`
      ALTER TABLE "judge_feedback" RENAME COLUMN "created_at" TO "submitted_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`
      ALTER TABLE "judge_feedback" RENAME COLUMN "submitted_at" TO "created_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "judge_feedback" RENAME COLUMN "feedback" TO "comment"
    `);
  }
}
