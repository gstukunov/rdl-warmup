import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminTokenService } from '../admin-token.service';

export interface AdminRequest {
  isAdmin: boolean;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly tokenService: AdminTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Extract token from Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization format');
    }

    const token = parts[1];

    // Validate token
    if (!this.tokenService.validateToken(token)) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Mark request as admin
    (request as any).isAdmin = true;

    return true;
  }
}
