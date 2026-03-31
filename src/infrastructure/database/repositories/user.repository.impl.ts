/**
 * User Repository Implementation
 * 
 * Implements IUserRepository using TypeORM.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../../domain/repository-interfaces/user.repository';
import { User as DomainUser } from '../../../domain/entities/user.entity';
import { User as TypeOrmUser } from '../../../user/entities/user.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(TypeOrmUser)
    private readonly repository: Repository<TypeOrmUser>,
  ) {}

  async findById(id: UserId): Promise<DomainUser | null> {
    const user = await this.repository.findOne({
      where: { id: id.value },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findByTelegramId(telegramId: TelegramId): Promise<DomainUser | null> {
    const user = await this.repository.findOne({
      where: { telegramId: telegramId.value },
    });

    return user ? UserMapper.toDomain(user) : null;
  }

  async findAll(): Promise<DomainUser[]> {
    const users = await this.repository.find();
    return users.map(UserMapper.toDomain);
  }

  async findAllOrderedByPoints(): Promise<DomainUser[]> {
    const users = await this.repository.find({
      order: { totalPoints: 'DESC' },
    });
    return users.map(UserMapper.toDomain);
  }

  async save(user: DomainUser): Promise<void> {
    const typeOrmUser = UserMapper.toTypeOrm(user);
    await this.repository.save(typeOrmUser);
  }

  async delete(id: UserId): Promise<void> {
    await this.repository.delete(id.value);
  }

  async existsByTelegramId(telegramId: TelegramId): Promise<boolean> {
    const count = await this.repository.count({
      where: { telegramId: telegramId.value },
    });
    return count > 0;
  }
}
