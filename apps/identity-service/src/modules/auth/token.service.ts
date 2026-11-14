import { loadRsaKeyPair, parseAuthClaims } from '@packages/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AUTH_CONFIG } from './constants/auth.constants.js';
import type { TokenPair } from './types/token.type.js';

@Injectable()
export class TokenService {
  private readonly accessKeys: {
    privateKey: string;
    publicKey: string;
  };

  private readonly refreshKeys: {
    privateKey: string;
    publicKey: string;
  };

  private readonly issuer: string;
  private readonly accessAudience: string;
  private readonly refreshAudience: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.issuer = config.getOrThrow<string>('JWT_ISSUER');

    this.accessAudience = config.getOrThrow<string>('JWT_ACCESS_AUDIENCE');

    this.refreshAudience = config.getOrThrow<string>('JWT_REFRESH_AUDIENCE');

    this.accessKeys = loadRsaKeyPair(
      config.getOrThrow<string>('JWT_ACCESS_PRIVATE_KEY_PATH'),
      config.getOrThrow<string>('JWT_ACCESS_PUBLIC_KEY_PATH'),
    );

    this.refreshKeys = loadRsaKeyPair(
      config.getOrThrow<string>('JWT_REFRESH_PRIVATE_KEY_PATH'),
      config.getOrThrow<string>('JWT_REFRESH_PUBLIC_KEY_PATH'),
    );

    if (this.accessKeys.publicKey === this.refreshKeys.publicKey) {
      throw new Error(
        'Access and refresh tokens must use different RSA key pairs',
      );
    }
  }

  async issue(
    userId: string,
    familyId: string,
    refreshExpiresAt: number,
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);

    if (refreshExpiresAt <= now) {
      throw new UnauthorizedException('Login session has expired');
    }

    const refreshId = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sid: familyId,
          tokenUse: 'access',
          exp: Math.min(now + AUTH_CONFIG.ACCESS_TTL_SECONDS, refreshExpiresAt),
        },
        {
          privateKey: this.accessKeys.privateKey,
          algorithm: 'RS256',
          issuer: this.issuer,
          audience: this.accessAudience,
          subject: userId,
          jwtid: randomUUID(),
        },
      ),

      this.jwt.signAsync(
        {
          sid: familyId,
          tokenUse: 'refresh',
          exp: refreshExpiresAt,
        },
        {
          privateKey: this.refreshKeys.privateKey,
          algorithm: 'RS256',
          issuer: this.issuer,
          audience: this.refreshAudience,
          subject: userId,
          jwtid: refreshId,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshId,
      expiresAt: new Date(refreshExpiresAt * 1000),
    };
  }

  async verifyAccess(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        {
          publicKey: this.accessKeys.publicKey,
          algorithms: ['RS256'],
          issuer: this.issuer,
          audience: this.accessAudience,
        },
      );

      return parseAuthClaims(payload, 'access');
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        {
          publicKey: this.refreshKeys.publicKey,
          algorithms: ['RS256'],
          issuer: this.issuer,
          audience: this.refreshAudience,
        },
      );

      return parseAuthClaims(payload, 'refresh');
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
