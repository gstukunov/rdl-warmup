import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserColumnsToSnakeCase1774984638000 implements MigrationInterface {
  name = 'RenameUserColumnsToSnakeCase1774984638000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get actual column names from the database
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    const columnNames = columns.map((c: { column_name: string }) => c.column_name);

    // Rename only columns that still have camelCase names
    if (columnNames.includes('telegramId')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "telegramId" TO "telegram_id";
      `);
    }

    if (columnNames.includes('firstName')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "firstName" TO "first_name";
      `);
    }

    if (columnNames.includes('lastName')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "lastName" TO "last_name";
      `);
    }

    if (columnNames.includes('isActive')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "isActive" TO "is_active";
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to camelCase (reverse order)
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    const columnNames = columns.map((c: { column_name: string }) => c.column_name);

    if (columnNames.includes('is_active')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "is_active" TO "isActive";
      `);
    }

    if (columnNames.includes('last_name')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "last_name" TO "lastName";
      `);
    }

    if (columnNames.includes('first_name')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "first_name" TO "firstName";
      `);
    }

    if (columnNames.includes('telegram_id')) {
      await queryRunner.query(`
        ALTER TABLE users 
        RENAME COLUMN "telegram_id" TO "telegramId";
      `);
    }
  }
}
