import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GameParticipant } from './game-participant.entity';

export enum GameStatus {
  REGISTRATION = 'registration',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Using the existing games table from the debate system migration
@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'game_password', type: 'varchar', length: 255, nullable: true })
  gamePassword: string | null;

  @Column({ name: 'status', type: 'enum', enum: GameStatus, default: GameStatus.REGISTRATION })
  status: GameStatus;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ name: 'motion', type: 'text', nullable: true })
  motion: string | null;

  @Column({ name: 'total_rounds', type: 'int', default: 1 })
  totalRounds: number;

  @Column({ name: 'current_round', type: 'int', default: 0 })
  currentRound: number;

  @Column({ name: 'settings', type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual property for created_by_telegram_id (stored in settings)
  get createdByTelegramId(): number | undefined {
    return this.settings?.createdByTelegramId;
  }

  set createdByTelegramId(value: number | undefined) {
    if (!this.settings) this.settings = {};
    this.settings.createdByTelegramId = value;
  }

  // Virtual property for max_participants (stored in settings)
  get maxParticipants(): number {
    return this.settings?.maxParticipants || 8;
  }

  set maxParticipants(value: number) {
    if (!this.settings) this.settings = {};
    this.settings.maxParticipants = value;
  }

  @OneToMany(() => GameParticipant, (participant) => participant.game)
  participants: GameParticipant[];
}
