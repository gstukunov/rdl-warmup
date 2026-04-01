import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserColumnsToSnakeCase1774984638000 implements MigrationInterface {
  name = 'RenameUserColumnsToSnakeCase1774984638000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename columns from camelCase to snake_case to match entity definitions
    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "telegramId" TO "telegram_id";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "firstName" TO "first_name";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "lastName" TO "last_name";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "isActive" TO "is_active";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to camelCase
    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "is_active" TO "isActive";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "last_name" TO "lastName";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "first_name" TO "firstName";
    `);

    await queryRunner.query(`
      ALTER TABLE users 
      RENAME COLUMN "telegram_id" TO "telegramId";
    `);
  }
}
