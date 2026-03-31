import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoomAllocation } from './room-allocation.entity';
import { GameParticipant } from './game-participant.entity';

export enum RoomPosition {
  OPENING_GOVERNMENT = 'OG',
  OPENING_OPPOSITION = 'OO',
  CLOSING_GOVERNMENT = 'CG',
  CLOSING_OPPOSITION = 'CO',
}

@Entity('room_participants')
export class RoomParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @Column({
    name: 'position',
    type: 'enum',
    enum: RoomPosition,
  })
  position: RoomPosition;

  @Column({ name: 'is_ironman', type: 'boolean', default: false })
  isIronman: boolean;

  @ManyToOne(() => RoomAllocation, (room) => room.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: RoomAllocation;

  @ManyToOne(() => GameParticipant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: GameParticipant;
}
