import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'telegramId', type: 'bigint', unique: true })
  @Index()
  telegramId: number;

  @Column({ name: 'username', type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName: string | null;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'preferences', type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @Column({ name: 'games_played', type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ name: 'speaker_scores', type: 'jsonb', default: [] })
  speakerScores: number[];

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
