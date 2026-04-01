import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from './user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.repository.findOne({ where: { telegramId } });
  }

  async findAll(): Promise<User[]> {
    return this.repository.find();
  }

  async findAllWithStats(): Promise<User[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async update(userId: string, userData: Partial<User>): Promise<void> {
    await this.repository.update(userId, userData);
  }

  async delete(userId: string): Promise<void> {
    await this.repository.delete(userId);
  }

  async exists(telegramId: number): Promise<boolean> {
    const count = await this.repository.count({ where: { telegramId } });
    return count > 0;
  }
}
