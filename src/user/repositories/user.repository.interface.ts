import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: number): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllWithStats(): Promise<User[]>;
  create(userData: Partial<User>): Promise<User>;
  save(user: User): Promise<User>;
  update(userId: string, userData: Partial<User>): Promise<void>;
  delete(userId: string): Promise<void>;
  exists(telegramId: number): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
