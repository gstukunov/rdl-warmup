import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AdminRequest {
  isAdmin: boolean;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Extract password from Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const providedPassword = parts[1];
    const adminPassword = this.configService.get<string>('admin.password');

    if (!adminPassword) {
      throw new UnauthorizedException('Admin password not configured');
    }

    if (providedPassword !== adminPassword) {
      throw new UnauthorizedException('Invalid admin password');
    }

    // Mark request as admin
    (request as any).isAdmin = true;

    return true;
  }
}
