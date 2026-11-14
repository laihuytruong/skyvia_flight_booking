import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { readBearerToken } from '@packages/common';
import type { AuthClaims } from '@packages/common';
import type { Request } from 'express';
import type { UserRole } from '../../generated/prisma/client.js';
import { SessionService } from '../sessions/session.service.js';
import { TokenService } from './token.service.js';

export type IdentityAuthRequest = Request & {
  auth: AuthClaims;
  user: {
    id: string;
    role: UserRole;
  };
};

@Injectable()
export class IdentityAccessGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IdentityAuthRequest>();

    let token: string;

    try {
      token = readBearerToken(request.headers.authorization);
    } catch {
      throw new UnauthorizedException('Access token is required');
    }

    request.auth = await this.tokens.verifyAccess(token);

    request.user = await this.sessions.authenticate(request.auth);

    return true;
  }
}
