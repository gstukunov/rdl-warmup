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

@Entity('judge_feedback')
@Unique(['gameId', 'playerTelegramId', 'judgeTelegramId'])
export class JudgeFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @Column({ name: 'player_telegram_id', type: 'bigint' })
  playerTelegramId: number;

  @Column({ name: 'judge_telegram_id', type: 'bigint' })
  judgeTelegramId: number;

  @Column({ name: 'score', type: 'int' })
  score: number; // 1-10 or any range

  @Column({ name: 'feedback', type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;
}
