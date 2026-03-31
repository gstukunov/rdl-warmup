import { RoomAllocation } from '../entities/room-allocation.entity';

export interface IRoomAllocationRepository {
  findById(id: string): Promise<RoomAllocation | null>;
  findByGameId(gameId: string): Promise<RoomAllocation[]>;
  findByGameIdWithRelations(gameId: string): Promise<RoomAllocation[]>;
  create(allocationData: Partial<RoomAllocation>): Promise<RoomAllocation>;
  save(allocation: RoomAllocation): Promise<RoomAllocation>;
  delete(id: string): Promise<void>;
  deleteByGameId(gameId: string): Promise<void>;
}

export const ROOM_ALLOCATION_REPOSITORY = Symbol('ROOM_ALLOCATION_REPOSITORY');
