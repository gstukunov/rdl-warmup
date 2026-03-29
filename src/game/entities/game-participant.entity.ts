import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from './game.entity';

export enum ParticipantRole {
  PLAYER = 'player',
  JUDGE = 'judge',
  BOTH = 'both',
  WING = 'wing',
}

export enum ParticipantPosition {
  OPENING_GOVERNMENT = 'opening_government',
  OPENING_OPPOSITION = 'opening_opposition',
  CLOSING_GOVERNMENT = 'closing_government',
  CLOSING_OPPOSITION = 'closing_opposition',
  NONE = 'none',
}

// Using the existing game_participants table from the debate system migration
@Entity('game_participants')
export class GameParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'telegram_id', type: 'bigint', nullable: true })
  telegramId: number | null;

  @Column({ name: 'username', type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: true })
  firstName: string | null;

  @Column({ 
    name: 'role', 
    type: 'enum', 
    enum: ParticipantRole, 
    default: ParticipantRole.PLAYER 
  })
  role: ParticipantRole;

  @Column({ 
    name: 'position', 
    type: 'enum', 
    enum: ParticipantPosition, 
    default: ParticipantPosition.NONE 
  })
  position: ParticipantPosition;

  @Column({ name: 'team_name', type: 'varchar', length: 255, nullable: true })
  teamName: string | null;

  @Column({ name: 'isRegistered', type: 'boolean', default: false })
  isRegistered: boolean;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @ManyToOne(() => Game, (game) => game.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;
}
