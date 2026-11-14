import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthClaims } from '@packages/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LockedUser } from '../../types/user.type.js';
import { TOKEN_PURPOSE } from '../../constants/constant.js';

@Injectable()
export class AuthSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(claims: AuthClaims) {
    const now = new Date();

    const session = await this.prisma.session.findFirst({
      where: {
        id: claims.sid,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          status: 'ACTIVE',
          emailVerifiedAt: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Login session is no longer active');
    }

    await this.prisma.session.updateMany({
      where: {
        id: session.id,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        lastSeenAt: {
          lt: new Date(now.getTime() - 60_000),
        },
      },
      data: {
        lastSeenAt: now,
      },
    });

    return session.user;
  }

  async lockUser(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<LockedUser | undefined> {
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
        WHERE id = ${userId}::uuid
        FOR UPDATE
      `,
    );

    return rows[0];
  }

  async lockActiveUser(
    tx: Prisma.TransactionClient,
    claims: AuthClaims,
  ): Promise<LockedUser> {
    const user = await this.lockUser(tx, claims.sub);

    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      throw new UnauthorizedException('Account is not available');
    }

    const session = await tx.session.findFirst({
      where: {
        id: claims.sid,
        userId: user.id,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Login session is no longer active');
    }

    return user;
  }

  async revokeFamily(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    now = new Date(),
  ): Promise<void> {
    await tx.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.verificationToken.updateMany({
      where: {
        userId,
        familyId: sessionId,
        purpose: TOKEN_PURPOSE.REFRESH_TOKEN,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
  }

  async revokeAll(
    tx: Prisma.TransactionClient,
    userId: string,
    now = new Date(),
  ): Promise<void> {
    await tx.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.verificationToken.updateMany({
      where: {
        userId,
        purpose: TOKEN_PURPOSE.REFRESH_TOKEN,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
  }
}
