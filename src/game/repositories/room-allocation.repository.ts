import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomAllocation } from '../entities/room-allocation.entity';
import { IRoomAllocationRepository } from './room-allocation.repository.interface';

@Injectable()
export class RoomAllocationRepository implements IRoomAllocationRepository {
  constructor(
    @InjectRepository(RoomAllocation)
    private readonly repository: Repository<RoomAllocation>,
  ) {}

  async findById(id: string): Promise<RoomAllocation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['participants', 'judges'],
    });
  }

  async findByGameId(gameId: string): Promise<RoomAllocation[]> {
    return this.repository.find({
      where: { gameId },
      order: { roomNumber: 'ASC' },
    });
  }

  async findByGameIdWithRelations(gameId: string): Promise<RoomAllocation[]> {
    return this.repository.find({
      where: { gameId },
      relations: ['participants', 'participants.participant', 'judges', 'judges.participant'],
      order: { roomNumber: 'ASC' },
    });
  }

  async create(allocationData: Partial<RoomAllocation>): Promise<RoomAllocation> {
    const allocation = this.repository.create(allocationData);
    return this.repository.save(allocation);
  }

  async save(allocation: RoomAllocation): Promise<RoomAllocation> {
    return this.repository.save(allocation);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.repository.delete({ gameId });
  }
}
