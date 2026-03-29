import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWingRole1774044719145 implements MigrationInterface {
    name = 'AddWingRole1774044719145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add 'wing' to the game_participants_role_enum
        await queryRunner.query(`ALTER TYPE "public"."game_participants_role_enum" ADD VALUE 'wing'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // To properly revert, we would need to create a new enum without 'wing' and migrate data
        // This is a limitation of PostgreSQL enums
        // For now, we leave it as is since removing enum values is complex and rarely needed
    }
}
