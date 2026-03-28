import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJudgeFeedbackTable1774044719143 implements MigrationInterface {
  name = 'CreateJudgeFeedbackTable1774044719143';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create judge_feedback table
    await queryRunner.query(`
      CREATE TABLE "judge_feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "game_id" uuid NOT NULL,
        "player_telegram_id" bigint NOT NULL,
        "judge_telegram_id" bigint NOT NULL,
        "score" int NOT NULL,
        "feedback" text,
        "submitted_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_JUDGE_FEEDBACK_PLAYER_JUDGE" UNIQUE ("game_id", "player_telegram_id", "judge_telegram_id"),
        CONSTRAINT "CHK_JUDGE_FEEDBACK_SCORE" CHECK ("score" >= 1 AND "score" <= 10),
        CONSTRAINT "PK_JUDGE_FEEDBACK" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_JUDGE_FEEDBACK_GAME_ID" ON "judge_feedback" ("game_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_JUDGE_FEEDBACK_PLAYER_ID" ON "judge_feedback" ("player_telegram_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_JUDGE_FEEDBACK_JUDGE_ID" ON "judge_feedback" ("judge_telegram_id")
    `);

    // Add foreign key to games table
    await queryRunner.query(`
      ALTER TABLE "judge_feedback" 
      ADD CONSTRAINT "FK_JUDGE_FEEDBACK_GAME" 
      FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "judge_feedback" DROP CONSTRAINT "FK_JUDGE_FEEDBACK_GAME"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_JUDGE_FEEDBACK_JUDGE_ID"`);
    await queryRunner.query(`DROP INDEX "IDX_JUDGE_FEEDBACK_PLAYER_ID"`);
    await queryRunner.query(`DROP INDEX "IDX_JUDGE_FEEDBACK_GAME_ID"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "judge_feedback"`);
  }
}
