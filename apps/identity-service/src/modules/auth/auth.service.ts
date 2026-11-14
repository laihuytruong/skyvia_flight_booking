import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthClaims } from '@packages/common';
import * as bcrypt from 'bcrypt';
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import {
  LockedUser,
  LoginClientInfo,
  PublicUser,
  RefreshResult,
  TokenPair,
} from '../../types/user.type.js';
import { OtpMail } from '../../types/mail.type.js';
import { AUTH_CONFIG, TOKEN_PURPOSE } from '../../constants/constant.js';
import { MailService } from '../mail/mail.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AuthSessionService } from './auth-session.service.js';

@Injectable()
export class AuthService {
  private readonly otpSecret: Buffer;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly tokens: TokenService,
    config: ConfigService,
    private readonly sessions: AuthSessionService,
  ) {
    const secret = config.getOrThrow<string>('EMAIL_OTP_SECRET').trim();

    if (!/^[a-fA-F0-9]{64}$/.test(secret)) {
      throw new Error('EMAIL_OTP_SECRET must contain 64 hex characters');
    }

    this.otpSecret = Buffer.from(secret, 'hex');
  }

  private publicUser(user: PublicUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashOtp(id: string, code: string): string {
    return createHmac('sha256', this.otpSecret)
      .update(`verify-email:${id}:${code}`)
      .digest('hex');
  }

  private matchesOtp(id: string, code: string, hash: string): boolean {
    if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(this.hashOtp(id, code), 'hex'),
      Buffer.from(hash, 'hex'),
    );
  }

  private hashPasswordResetOtp(id: string, code: string): string {
    return createHmac('sha256', this.otpSecret)
      .update(`reset-password:${id}:${code}`)
      .digest('hex');
  }

  private matchesPasswordResetOtp(
    id: string,
    code: string,
    hash: string,
  ): boolean {
    if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(this.hashPasswordResetOtp(id, code), 'hex'),
      Buffer.from(hash, 'hex'),
    );
  }

  private async lockUser(
    tx: Prisma.TransactionClient,
    value: string,
    by: 'id' | 'email',
  ): Promise<LockedUser | undefined> {
    const condition =
      by === 'id'
        ? Prisma.sql`id = ${value}::uuid`
        : Prisma.sql`email = ${value}`;

    const rows = await tx.$queryRaw<LockedUser[]>(
      Prisma.sql`
      SELECT
        id,
        email,
        full_name AS "fullName",
        password_hash AS "passwordHash",
        role,
        status,
        email_verified_at AS "emailVerifiedAt"
      FROM identity.users
      WHERE ${condition}
      FOR UPDATE
    `,
    );

    return rows[0];
  }

  private async createOtp(
    tx: Prisma.TransactionClient,
    user: {
      id: string;
      email: string;
    },
  ): Promise<OtpMail> {
    const now = new Date();

    const recent = await tx.verificationToken.findMany({
      where: {
        userId: user.id,
        purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        tokenHash: true,
      },
    });

    await tx.verificationToken.updateMany({
      where: {
        userId: user.id,
        purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    const id = randomUUID();

    let code: string;

    do {
      code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    } while (
      recent.some((token) => this.matchesOtp(token.id, code, token.tokenHash))
    );

    const expiresAt = new Date(now.getTime() + AUTH_CONFIG.OTP_TTL_MS);

    await tx.verificationToken.create({
      data: {
        id,
        userId: user.id,
        purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
        tokenHash: this.hashOtp(id, code),
        expiresAt,
        createdAt: now,
      },
    });

    return {
      to: user.email,
      code,
      expiresAt,
    };
  }

  private async sendOtp(mail: OtpMail): Promise<boolean> {
    try {
      await this.mail.sendVerificationEmail(mail);

      return true;
    } catch {
      return false;
    }
  }

  private async createTokenPair(
    tx: Prisma.TransactionClient,
    userId: string,
    familyId: string,
    expiresAt: number,
  ): Promise<TokenPair> {
    const pair = await this.tokens.issue(userId, familyId, expiresAt);

    await tx.verificationToken.create({
      data: {
        id: pair.refreshId,
        userId,
        purpose: TOKEN_PURPOSE.REFRESH_TOKEN,
        familyId,
        tokenHash: this.hashRefreshToken(pair.refreshToken),
        expiresAt: pair.expiresAt,
      },
    });

    return pair;
  }

  async register(dto: RegisterDto) {
    if (
      Buffer.byteLength(dto.password, 'utf8') > AUTH_CONFIG.BCRYPT_MAX_BYTES
    ) {
      throw new BadRequestException({
        message: 'Password must not exceed 72 UTF-8 bytes',
        errors: {
          password: ['Password must not exceed 72 UTF-8 bytes'],
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      AUTH_CONFIG.BCRYPT_ROUNDS,
    );

    const result = await this.prisma
      .$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            fullName: dto.fullName,
            passwordHash,
            status: 'PENDING',
            role: 'CUSTOMER',
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            role: true,
          },
        });

        const mail = await this.createOtp(tx, user);

        return {
          user,
          mail,
        };
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            message: 'Email is already registered',
            errors: {
              email: ['Email is already registered'],
            },
          });
        }

        throw error;
      });

    const emailAccepted = await this.sendOtp(result.mail);

    return {
      message: emailAccepted
        ? 'Account created. Please check your verification email.'
        : 'Account created. Email could not be sent. Please request a new code.',
      data: {
        user: result.user,
        verificationEmailAccepted: emailAccepted,
      },
    };
  }

  async resendVerification(email: string) {
    const mail = await this.prisma.$transaction(
      async (tx): Promise<OtpMail | null> => {
        const user = await this.lockUser(tx, email, 'email');

        if (!user || user.status !== 'PENDING') {
          return null;
        }

        const now = new Date();

        const latest = await tx.verificationToken.findFirst({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
          },
          orderBy: [
            {
              createdAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
        });

        if (
          latest &&
          now.getTime() - latest.createdAt.getTime() <
            AUTH_CONFIG.RESEND_COOLDOWN_MS
        ) {
          return null;
        }

        const count = await tx.verificationToken.count({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60_000),
            },
          },
        });

        if (count >= AUTH_CONFIG.MAX_EMAIL_CODES_PER_HOUR) {
          return null;
        }

        return this.createOtp(tx, user);
      },
    );

    if (mail) {
      await this.sendOtp(mail);
    }

    return {
      message:
        'If the account is eligible, a verification email will be sent. Please wait at least 60 seconds before requesting another code.',
    };
  }

  async verifyEmail(email: string, code: string) {
    const verified = await this.prisma.$transaction(async (tx) => {
      const user = await this.lockUser(tx, email, 'email');

      if (!user || user.status !== 'PENDING') {
        return false;
      }

      const now = new Date();

      const token = await tx.verificationToken.findFirst({
        where: {
          userId: user.id,
          purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
          consumedAt: null,
          revokedAt: null,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      });

      if (
        !token ||
        token.expiresAt <= now ||
        token.attempts >= AUTH_CONFIG.OTP_MAX_ATTEMPTS
      ) {
        return false;
      }

      const valid = this.matchesOtp(token.id, code, token.tokenHash);

      if (!valid) {
        const attempts = token.attempts + 1;

        await tx.verificationToken.update({
          where: {
            id: token.id,
            purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
          },
          data: {
            attempts,
            ...(attempts >= AUTH_CONFIG.OTP_MAX_ATTEMPTS
              ? {
                  revokedAt: now,
                }
              : {}),
          },
        });

        return false;
      }

      await tx.verificationToken.update({
        where: {
          id: token.id,
          purpose: TOKEN_PURPOSE.EMAIL_VERIFICATION,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: now,
        },
      });

      return true;
    });

    if (!verified) {
      throw new BadRequestException({
        message: 'Invalid or expired verification code',
        errors: {
          code: ['Invalid or expired verification code'],
        },
      });
    }

    return {
      message: 'Email verified successfully',
    };
  }

  async login(dto: LoginDto, client: LoginClientInfo = {}) {
    const checkedUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (
      !checkedUser?.passwordHash ||
      Buffer.byteLength(dto.password, 'utf8') > AUTH_CONFIG.BCRYPT_MAX_BYTES ||
      !(await bcrypt.compare(dto.password, checkedUser.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await this.lockUser(tx, checkedUser.id, 'id');

      if (
        !user ||
        user.status !== 'ACTIVE' ||
        !user.emailVerifiedAt ||
        user.passwordHash !== checkedUser.passwordHash
      ) {
        throw new UnauthorizedException('Account is not available for login');
      }

      const now = new Date();
      const sessionId = randomUUID();

      const expiresAt =
        Math.floor(now.getTime() / 1000) + AUTH_CONFIG.REFRESH_TTL_SECONDS;

      await tx.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          ipAddress: client.ipAddress ?? null,
          userAgent: client.userAgent?.slice(0, 512) ?? null,
          createdAt: now,
          lastSeenAt: now,
          expiresAt: new Date(expiresAt * 1000),
        },
      });

      const pair = await this.createTokenPair(
        tx,
        user.id,
        sessionId,
        expiresAt,
      );

      return {
        user: this.publicUser(user),
        pair,
      };
    });

    return {
      message: 'Login successful',
      data: {
        user: result.user,
      },
      accessToken: result.pair.accessToken,
      refreshToken: result.pair.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const claims = await this.tokens.verifyRefresh(refreshToken);

    const hash = this.hashRefreshToken(refreshToken);

    const result = await this.prisma.$transaction(
      async (tx): Promise<RefreshResult> => {
        const user = await this.lockUser(tx, claims.sub, 'id');

        if (!user) {
          return { ok: false };
        }

        const now = new Date();

        if (user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
          await this.sessions.revokeAll(tx, user.id, now);

          return { ok: false };
        }

        const session = await tx.session.findFirst({
          where: {
            id: claims.sid,
            userId: user.id,
            revokedAt: null,
            expiresAt: {
              gt: now,
            },
          },
        });

        if (!session) {
          await this.sessions.revokeFamily(tx, user.id, claims.sid, now);

          return { ok: false };
        }

        const stored = await tx.verificationToken.findFirst({
          where: {
            id: claims.jti,
            userId: user.id,
            purpose: TOKEN_PURPOSE.REFRESH_TOKEN,
            familyId: session.id,
            tokenHash: hash,
          },
        });

        if (!stored) {
          return { ok: false };
        }

        if (stored.consumedAt || stored.revokedAt || stored.expiresAt <= now) {
          await this.sessions.revokeFamily(tx, user.id, session.id, now);

          return { ok: false };
        }

        await tx.verificationToken.update({
          where: {
            id: stored.id,
          },
          data: {
            consumedAt: now,
          },
        });

        const expiresAt = Math.floor(
          Math.min(stored.expiresAt.getTime(), session.expiresAt.getTime()) /
            1000,
        );

        const pair = await this.createTokenPair(
          tx,
          user.id,
          session.id,
          expiresAt,
        );

        await tx.session.update({
          where: {
            id: session.id,
          },
          data: {
            lastSeenAt: now,
          },
        });

        return {
          ok: true,
          pair,
          user: this.publicUser(user),
        };
      },
    );

    if (!result.ok) {
      throw new UnauthorizedException(
        'Invalid refresh token or session revoked',
      );
    }

    return {
      message: 'Token refreshed successfully',
      data: {
        user: result.user,
      },
      accessToken: result.pair.accessToken,
      refreshToken: result.pair.refreshToken,
    };
  }

  async logout(refreshToken: string) {
    const claims = await this.tokens.verifyRefresh(refreshToken);

    const hash = this.hashRefreshToken(refreshToken);

    await this.prisma.$transaction(async (tx) => {
      const user = await this.lockUser(tx, claims.sub, 'id');

      if (!user) {
        return;
      }

      const stored = await tx.verificationToken.findFirst({
        where: {
          id: claims.jti,
          userId: user.id,
          purpose: TOKEN_PURPOSE.REFRESH_TOKEN,
          familyId: claims.sid,
          tokenHash: hash,
        },
        select: {
          id: true,
        },
      });

      if (!stored) {
        return;
      }

      await this.sessions.revokeFamily(tx, user.id, claims.sid);
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async me(claims: AuthClaims) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: claims.sub,
        status: 'ACTIVE',
        emailVerifiedAt: {
          not: null,
        },
        sessions: {
          some: {
            id: claims.sid,
            revokedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Login session is no longer active');
    }

    return {
      data: {
        user,
      },
    };
  }

  async forgotPassword(email: string) {
    const mail = await this.prisma.$transaction(
      async (tx): Promise<OtpMail | null> => {
        const user = await this.lockUser(tx, email, 'email');

        if (
          !user ||
          user.status !== 'ACTIVE' ||
          !user.emailVerifiedAt ||
          !user.passwordHash
        ) {
          return null;
        }

        const now = new Date();

        const latest = await tx.verificationToken.findFirst({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        if (
          latest &&
          now.getTime() - latest.createdAt.getTime() <
            AUTH_CONFIG.RESEND_COOLDOWN_MS
        ) {
          return null;
        }

        const count = await tx.verificationToken.count({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60_000),
            },
          },
        });

        if (count >= AUTH_CONFIG.MAX_EMAIL_CODES_PER_HOUR) {
          return null;
        }

        const recent = await tx.verificationToken.findMany({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
            expiresAt: {
              gt: now,
            },
          },
          select: {
            id: true,
            tokenHash: true,
          },
        });

        await tx.verificationToken.updateMany({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
            consumedAt: null,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        const id = randomUUID();

        let code: string;

        do {
          code = randomInt(0, 1_000_000).toString().padStart(6, '0');
        } while (
          recent.some((token) =>
            this.matchesPasswordResetOtp(token.id, code, token.tokenHash),
          )
        );

        const expiresAt = new Date(now.getTime() + AUTH_CONFIG.OTP_TTL_MS);

        await tx.verificationToken.create({
          data: {
            id,
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
            tokenHash: this.hashPasswordResetOtp(id, code),
            expiresAt,
            createdAt: now,
          },
        });

        return {
          to: user.email,
          code,
          expiresAt,
        };
      },
    );

    if (mail) {
      try {
        await this.mail.sendPasswordResetEmail(mail);
      } catch {
        this.logger.error('Password reset email delivery failed');
      }
    }

    return {
      message:
        'If the account is eligible, a password reset code will be sent. Please wait at least 60 seconds before requesting another code.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (
      Buffer.byteLength(dto.newPassword, 'utf8') > AUTH_CONFIG.BCRYPT_MAX_BYTES
    ) {
      throw new BadRequestException({
        message: 'Password must not exceed 72 UTF-8 bytes',
        errors: {
          newPassword: ['Password must not exceed 72 UTF-8 bytes'],
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      AUTH_CONFIG.BCRYPT_ROUNDS,
    );

    const success = await this.prisma.$transaction(
      async (tx): Promise<boolean> => {
        const user = await this.lockUser(tx, dto.email, 'email');

        if (
          !user ||
          user.status !== 'ACTIVE' ||
          !user.emailVerifiedAt ||
          !user.passwordHash
        ) {
          return false;
        }

        const now = new Date();

        const token = await tx.verificationToken.findFirst({
          where: {
            userId: user.id,
            purpose: TOKEN_PURPOSE.PASSWORD_RESET,
            consumedAt: null,
            revokedAt: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        if (
          !token ||
          token.expiresAt <= now ||
          token.attempts >= AUTH_CONFIG.OTP_MAX_ATTEMPTS
        ) {
          return false;
        }

        const valid = this.matchesPasswordResetOtp(
          token.id,
          dto.code,
          token.tokenHash,
        );

        if (!valid) {
          const attempts = token.attempts + 1;

          await tx.verificationToken.update({
            where: {
              id: token.id,
            },
            data: {
              attempts,
              ...(attempts >= AUTH_CONFIG.OTP_MAX_ATTEMPTS
                ? { revokedAt: now }
                : {}),
            },
          });

          return false;
        }

        await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            passwordHash,
          },
        });

        await tx.verificationToken.update({
          where: {
            id: token.id,
          },
          data: {
            consumedAt: now,
          },
        });

        await tx.verificationToken.updateMany({
          where: {
            userId: user.id,
            purpose: {
              in: [TOKEN_PURPOSE.REFRESH_TOKEN, TOKEN_PURPOSE.PASSWORD_RESET],
            },
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        await this.sessions.revokeAll(tx, user.id, now);

        return true;
      },
    );

    if (!success) {
      throw new BadRequestException({
        message: 'Invalid or expired password reset code',
        errors: {
          code: ['Invalid or expired password reset code'],
        },
      });
    }

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }
}
