import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Game } from './game.entity';

@Entity('speaker_scores')
@Unique(['gameId', 'telegramId', 'position'])
export class SpeakerScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @Column({ name: 'telegram_id', type: 'bigint' })
  telegramId: number;

  @Column({ name: 'position', type: 'varchar', length: 50 })
  position: string; // 'opening_government', 'opening_opposition', etc.

  @Column({ name: 'score', type: 'int' })
  score: number;

  @Column({ name: 'is_ironman', type: 'boolean', default: false })
  isIronman: boolean;

  @Column({ name: 'judge_telegram_id', type: 'bigint' })
  judgeTelegramId: number;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;
}
