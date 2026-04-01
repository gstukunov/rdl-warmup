import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface WebAppRequest {
  telegramUser: TelegramUser;
  initData: string;
}

@Injectable()
export class WebAppAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebAppAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'] as string;

    this.logger.debug(`Received initData: ${initData ? initData.substring(0, 100) + '...' : 'EMPTY'}`);

    if (!initData) {
      this.logger.error('Missing Telegram init data header');
      throw new UnauthorizedException('Missing Telegram init data');
    }

    // Validate init data
    const isValid = this.validateInitData(initData);
    this.logger.debug(`Init data validation result: ${isValid}`);
    
    if (!isValid) {
      this.logger.error('Invalid Telegram init data hash');
      throw new UnauthorizedException('Invalid Telegram init data');
    }

    // Parse user from init data
    const user = this.parseUserFromInitData(initData);
    if (!user) {
      this.logger.error('Failed to parse user from init data');
      throw new UnauthorizedException('Invalid user data');
    }

    this.logger.log(`Authenticated user: ${user.id} (${user.username || user.first_name})`);

    // Attach user to request
    request.telegramUser = user;
    request.initData = initData;

    return true;
  }

  private validateInitData(initData: string): boolean {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      this.logger.error('TELEGRAM_BOT_TOKEN not configured');
      return false;
    }

    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      
      if (!hash) {
        this.logger.error('No hash in initData');
        return false;
      }

      params.delete('hash');
      
      // Sort params alphabetically
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      this.logger.debug(`Data check string: ${dataCheckString.substring(0, 200)}...`);
      this.logger.debug(`Received hash: ${hash}`);

      // Create secret key from bot token
      const secretKey = createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Calculate hash
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      this.logger.debug(`Calculated hash: ${calculatedHash}`);

      return calculatedHash === hash;
    } catch (error) {
      this.logger.error(`Validation error: ${error.message}`);
      return false;
    }
  }

  private parseUserFromInitData(initData: string): TelegramUser | null {
    try {
      const params = new URLSearchParams(initData);
      const userJson = params.get('user');
      
      if (!userJson) {
        this.logger.error('No user field in initData');
        return null;
      }

      return JSON.parse(userJson) as TelegramUser;
    } catch (error) {
      this.logger.error(`Parse error: ${error.message}`);
      return null;
    }
  }
}
