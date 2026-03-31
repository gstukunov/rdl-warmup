import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoomAllocation } from './room-allocation.entity';
import { GameParticipant } from './game-participant.entity';

export enum JudgeRole {
  CHAIR = 'chair',
  WING = 'wing',
}

@Entity('room_judges')
export class RoomJudge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @Column({
    name: 'role',
    type: 'enum',
    enum: JudgeRole,
    default: JudgeRole.WING,
  })
  role: JudgeRole;

  @ManyToOne(() => RoomAllocation, (room) => room.judges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: RoomAllocation;

  @ManyToOne(() => GameParticipant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: GameParticipant;
}
