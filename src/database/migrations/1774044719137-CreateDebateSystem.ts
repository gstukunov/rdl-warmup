import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDebateSystem1774044719137 implements MigrationInterface {
    name = 'CreateDebateSystem1774044719137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ballots_type_enum" AS ENUM('speaker_score', 'team_win', 'best_speaker')`);
        await queryRunner.query(`CREATE TABLE "ballots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game_id" uuid NOT NULL, "judge_id" uuid NOT NULL, "target_user_id" uuid, "target_team" character varying, "type" "public"."ballots_type_enum" NOT NULL, "score" integer, "round" integer NOT NULL DEFAULT '1', "criteria" jsonb, "comments" text, "submitted_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1c29cf82a8045f839f8639634e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1fcca64975545f10a8eaf2503e" ON "ballots" ("game_id", "judge_id", "round") `);
        await queryRunner.query(`CREATE TYPE "public"."games_status_enum" AS ENUM('registration', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "games" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "game_password" character varying, "status" "public"."games_status_enum" NOT NULL DEFAULT 'registration', "start_time" TIMESTAMP, "end_time" TIMESTAMP, "motion" text, "total_rounds" integer NOT NULL DEFAULT '1', "current_round" integer NOT NULL DEFAULT '0', "settings" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_05318b3cbff2443bd581093bcb" ON "games" ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."game_participants_role_enum" AS ENUM('player', 'judge', 'both')`);
        await queryRunner.query(`CREATE TYPE "public"."game_participants_position_enum" AS ENUM('opening_government', 'opening_opposition', 'closing_government', 'closing_opposition', 'none')`);
        await queryRunner.query(`CREATE TABLE "game_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."game_participants_role_enum" NOT NULL DEFAULT 'player', "position" "public"."game_participants_position_enum" NOT NULL DEFAULT 'none', "team_name" character varying, "isRegistered" boolean NOT NULL DEFAULT false, "metadata" jsonb NOT NULL DEFAULT '{}', "registered_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_618ce5d9c1d1fc107c16f3d0e17" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f122243fcfcdc1e308bda2fff6" ON "game_participants" ("game_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "telegramId" bigint NOT NULL, "username" character varying, "first_name" character varying, "last_name" character varying, "isActive" boolean NOT NULL DEFAULT true, "preferences" jsonb DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_df18d17f84763558ac84192c754" UNIQUE ("telegramId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_df18d17f84763558ac84192c75" ON "users" ("telegramId") `);
        await queryRunner.query(`ALTER TABLE "ballots" ADD CONSTRAINT "FK_7736accfeaca26842226ce8e7ce" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ballots" ADD CONSTRAINT "FK_780f7867cec55d2d98e5f2ecab3" FOREIGN KEY ("judge_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ballots" ADD CONSTRAINT "FK_ba6d1db4fbb9671d885c5de29f8" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "game_participants" ADD CONSTRAINT "FK_58abb585a71bf07640194a62ebd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "game_participants" ADD CONSTRAINT "FK_1f734478543677e66383f1f5bd4" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_participants" DROP CONSTRAINT "FK_1f734478543677e66383f1f5bd4"`);
        await queryRunner.query(`ALTER TABLE "game_participants" DROP CONSTRAINT "FK_58abb585a71bf07640194a62ebd"`);
        await queryRunner.query(`ALTER TABLE "ballots" DROP CONSTRAINT "FK_ba6d1db4fbb9671d885c5de29f8"`);
        await queryRunner.query(`ALTER TABLE "ballots" DROP CONSTRAINT "FK_780f7867cec55d2d98e5f2ecab3"`);
        await queryRunner.query(`ALTER TABLE "ballots" DROP CONSTRAINT "FK_7736accfeaca26842226ce8e7ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df18d17f84763558ac84192c75"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f122243fcfcdc1e308bda2fff6"`);
        await queryRunner.query(`DROP TABLE "game_participants"`);
        await queryRunner.query(`DROP TYPE "public"."game_participants_position_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_participants_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05318b3cbff2443bd581093bcb"`);
        await queryRunner.query(`DROP TABLE "games"`);
        await queryRunner.query(`DROP TYPE "public"."games_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fcca64975545f10a8eaf2503e"`);
        await queryRunner.query(`DROP TABLE "ballots"`);
        await queryRunner.query(`DROP TYPE "public"."ballots_type_enum"`);
    }

}
