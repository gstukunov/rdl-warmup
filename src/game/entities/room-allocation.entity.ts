import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Game } from './game.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomJudge } from './room-judge.entity';

@Entity('room_allocations')
export class RoomAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'game_id', type: 'uuid' })
  gameId: string;

  @Column({ name: 'room_number', type: 'smallint' })
  roomNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Game, (game) => game.roomAllocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @OneToMany(() => RoomParticipant, (rp) => rp.room, { cascade: true })
  participants: RoomParticipant[];

  @OneToMany(() => RoomJudge, (rj) => rj.room, { cascade: true })
  judges: RoomJudge[];
}
