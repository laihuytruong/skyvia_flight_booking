import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthClaims } from '@packages/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionService } from '../sessions/session.service.js';
import type {
  ChangePasswordDto,
  SessionQueryDto,
  UpdateUserRoleDto,
} from '@packages/contracts';
import { USER_ROLES } from '@packages/contracts';
import { AUTH_CONFIG } from '../auth/constants/auth.constants.js';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async changePassword(claims: AuthClaims, dto: ChangePasswordDto) {
    if (
      Buffer.byteLength(dto.currentPassword, 'utf8') >
      AUTH_CONFIG.BCRYPT_MAX_BYTES
    ) {
      throw new BadRequestException({
        message: 'Current password is incorrect',
        errors: {
          currentPassword: ['Current password is incorrect'],
        },
      });
    }

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

    const checkedUser = await this.prisma.user.findUnique({
      where: {
        id: claims.sub,
      },
      select: {
        passwordHash: true,
      },
    });

    if (
      !checkedUser?.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, checkedUser.passwordHash))
    ) {
      throw new BadRequestException({
        message: 'Current password is incorrect',
        errors: {
          currentPassword: ['Current password is incorrect'],
        },
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        message: 'New password must be different from the current password',
        errors: {
          newPassword: [
            'New password must be different from the current password',
          ],
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      AUTH_CONFIG.BCRYPT_ROUNDS,
    );

    await this.prisma.$transaction(async (tx) => {
      const user = await this.sessions.lockActiveUser(tx, claims);

      if (user.passwordHash !== checkedUser.passwordHash) {
        throw new UnauthorizedException(
          'Account credentials have changed. Please log in again.',
        );
      }

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
        },
      });

      const now = new Date();

      await this.sessions.revokeAll(tx, user.id, now);

      await tx.verificationToken.updateMany({
        where: {
          userId: user.id,
          purpose: 'PASSWORD_RESET',
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  async logoutAll(claims: AuthClaims) {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.sessions.lockActiveUser(tx, claims);

      await this.sessions.revokeAll(tx, user.id);
    });

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  async listSessions(claims: AuthClaims, query: SessionQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const where = {
      userId: claims.sub,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
      where: {
        ...where,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
      },
      }),
      this.prisma.session.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return {
      data: {
        sessions: rows.map((session) => ({
          ...session,
          isCurrent: session.id === claims.sid,
        })),
      },
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async revokeSession(claims: AuthClaims, sessionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.sessions.lockActiveUser(tx, claims);

      const session = await tx.session.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      await this.sessions.revokeFamily(tx, user.id, session.id);
    });

    return {
      message: 'Session revoked successfully',
    };
  }

  async updateUserRole(
    claims: AuthClaims,
    userId: string,
    dto: UpdateUserRoleDto,
  ) {
    if (userId === claims.sub) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`
            SELECT id
            FROM identity.users
            WHERE id IN (
              ${claims.sub}::uuid,
              ${userId}::uuid
            )
            ORDER BY id
            FOR UPDATE
          `,
      );

      const actor = await this.sessions.lockActiveUser(tx, claims);

      if (actor.role !== USER_ROLES.ADMIN) {
        throw new ForbiddenException('Administrator permission is required');
      }

      const target = await this.sessions.lockUser(tx, userId);

      if (!target) {
        throw new NotFoundException('User not found');
      }

      if (target.status !== 'ACTIVE' || !target.emailVerifiedAt) {
        throw new BadRequestException(
          'Only active verified users can be assigned a role',
        );
      }

      const updated = await tx.user.update({
        where: {
          id: target.id,
        },
        data: {
          role: dto.role,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
        },
      });

      if (target.role !== dto.role) {
        await this.sessions.revokeAll(tx, target.id);
      }

      return updated;
    });

    return {
      message: 'User role updated successfully',
      data: {
        user,
      },
    };
  }
}
