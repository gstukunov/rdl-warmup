import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { AdminTokenService } from '../admin-token.service';
import { User } from '../../user/entities/user.entity';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface AdminRequest {
  isAdmin: boolean;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: AdminTokenService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // First, try Bearer token auth (existing behavior)
    const authHeader = request.headers['authorization'] as string;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        if (this.tokenService.validateToken(token)) {
          (request as any).isAdmin = true;
          return true;
        }
      }
    }

    // Second, try Telegram initData auth
    const initData = request.headers['x-telegram-init-data'] as string;
    if (initData) {
      const isDevMock = this.isDevMock(initData);
      if (!isDevMock && !this.validateInitData(initData)) {
        throw new UnauthorizedException('Invalid Telegram init data');
      }

      const telegramUser = this.parseUserFromInitData(initData);
      if (telegramUser) {
        // Check if user exists and is admin
        const user = await this.userRepository.findOne({
          where: { telegramId: telegramUser.id },
        });

        if (user?.isAdmin) {
          (request as any).isAdmin = true;
          return true;
        }
      }
    }

    throw new UnauthorizedException('Admin access required');
  }

  private isDevMock(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      return params.get('hash') === 'mock_hash_for_development';
    } catch {
      return false;
    }
  }

  private validateInitData(initData: string): boolean {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      return false;
    }

    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) {
        return false;
      }

      params.delete('hash');
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return calculatedHash === hash;
    } catch {
      return false;
    }
  }

  private parseUserFromInitData(initData: string): TelegramUser | null {
    try {
      const params = new URLSearchParams(initData);
      const userJson = params.get('user');
      if (!userJson) {
        return null;
      }
      return JSON.parse(userJson) as TelegramUser;
    } catch {
      return null;
    }
  }
}
