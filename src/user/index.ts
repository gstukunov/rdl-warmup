// Public API exports
export { UserModule } from './user.module';
export { UserService } from './services/user.service';
export { User } from './entities/user.entity';
export { USER_REPOSITORY } from './repositories/user.repository.interface';
export type { 
  IUserRepository
} from './repositories/user.repository.interface';
export type { 
  CreateUserData, 
  UserProfile 
} from './services/user.service';
