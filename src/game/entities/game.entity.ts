import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GameParticipant } from './game-participant.entity';
import { RoomAllocation } from './room-allocation.entity';

export enum GameStatus {
  REGISTRATION = 'registration',
  ALLOCATING = 'allocating',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * @deprecated Use RoomAllocation entity instead. Kept for migration compatibility.
 */
export interface LegacyRoomAllocation {
  roomNumber: number;
  participants: {
    telegramId: number;
    position: string;
    isIronman: boolean;
  }[];
  judges: {
    telegramId: number;
  }[];
  wings?: {
    telegramId: number;
  }[];
}

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

  // New normalized columns (Phase 2)
  @Column({ name: 'max_participants', type: 'int', default: 8 })
  maxParticipants: number;

  @Column({ name: 'created_by_telegram_id', type: 'bigint', nullable: true })
  createdByTelegramId: number | null;

  @Column({ name: 'is_allocated', type: 'boolean', default: false })
  isAllocated: boolean;

  // Legacy settings column (to be removed after migration)
  @Column({ name: 'settings', type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => GameParticipant, (participant) => participant.game)
  participants: GameParticipant[];

  @OneToMany(() => RoomAllocation, (allocation) => allocation.game)
  roomAllocations: RoomAllocation[];

  /**
   * @deprecated Use roomAllocations relationship instead
   */
  get legacyRoomAllocations(): LegacyRoomAllocation[] {
    const allocations = this.settings?.roomAllocations || [];
    return allocations.map((alloc: LegacyRoomAllocation) => ({
      ...alloc,
      judges: alloc.judges || []
    }));
  }

  /**
   * @deprecated Use maxParticipants column instead
   */
  get maxParticipantsFromSettings(): number {
    return this.settings?.maxParticipants || 8;
  }

  /**
   * @deprecated Use createdByTelegramId column instead
   */
  get createdByFromSettings(): number | undefined {
    return this.settings?.createdByTelegramId;
  }

  /**
   * @deprecated Use isAllocated column instead
   */
  get isAllocatedFromSettings(): boolean {
    return this.settings?.isAllocated || false;
  }
}
