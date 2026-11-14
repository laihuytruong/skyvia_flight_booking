import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  loadRsaPublicKey,
  parseAuthClaims,
  readAuthCookie,
  readBearerToken,
} from '@packages/common';
import type { Request } from 'express';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly publicKey: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.publicKey = loadRsaPublicKey(
      config.getOrThrow<string>('JWT_ACCESS_PUBLIC_KEY_PATH'),
    );

    this.issuer = config.getOrThrow<string>('JWT_ISSUER');

    this.audience = config.getOrThrow<string>('JWT_ACCESS_AUDIENCE');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      const token =
        readAuthCookie(request.headers.cookie, 'ACCESS_TOKEN') ??
        readBearerToken(request.headers.authorization);

      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        {
          publicKey: this.publicKey,
          algorithms: ['RS256'],
          issuer: this.issuer,
          audience: this.audience,
        },
      );

      parseAuthClaims(payload, 'access');

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
