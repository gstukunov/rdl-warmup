/**
 * User Mapper
 * 
 * Maps between domain User entity and TypeORM User entity.
 */

import { User as DomainUser } from '../../../domain/entities/user.entity';
import { User as TypeOrmUser } from '../../../user/entities/user.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo';

export class UserMapper {
  /**
   * Maps TypeORM entity to domain entity
   */
  static toDomain(typeOrmUser: TypeOrmUser): DomainUser {
    return DomainUser.reconstitute({
      id: UserId.reconstitute(typeOrmUser.id),
      telegramId: TelegramId.reconstitute(typeOrmUser.telegramId),
      username: typeOrmUser.username,
      firstName: typeOrmUser.firstName,
      lastName: typeOrmUser.lastName,
      isActive: typeOrmUser.isActive,
      isAdmin: typeOrmUser.isAdmin,
      createdAt: typeOrmUser.createdAt,
      updatedAt: typeOrmUser.updatedAt,
    });
  }

  /**
   * Maps domain entity to TypeORM entity
   */
  static toTypeOrm(domainUser: DomainUser): TypeOrmUser {
    const typeOrmUser = new TypeOrmUser();
    
    typeOrmUser.id = domainUser.id.value;
    typeOrmUser.telegramId = domainUser.telegramId.value;
    typeOrmUser.username = domainUser.username;
    typeOrmUser.firstName = domainUser.firstName;
    typeOrmUser.lastName = domainUser.lastName;
    typeOrmUser.isActive = domainUser.isActive;
    typeOrmUser.isAdmin = domainUser.isAdmin;
    typeOrmUser.createdAt = domainUser.createdAt;
    typeOrmUser.updatedAt = domainUser.updatedAt;
    typeOrmUser.preferences = {};

    return typeOrmUser;
  }
}
