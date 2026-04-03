import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminTokenService {
  private tokens = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  validatePassword(password: string): boolean {
    const adminPassword = this.configService.get<string>('admin.password');
    return password === adminPassword;
  }

  createToken(): string {
    const token = `admin_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    this.tokens.add(token);
    return token;
  }

  validateToken(token: string): boolean {
    return this.tokens.has(token);
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }
}
