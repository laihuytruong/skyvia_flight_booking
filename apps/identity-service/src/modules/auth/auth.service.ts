import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto.js';
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  BCRYPT_ROUNDS,
} from '../../constants/constant.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async registerUser(dto: RegisterDto) {
    const passwordBytes = Buffer.byteLength(dto.password, 'utf-8');

    if (passwordBytes > BCRYPT_MAX_PASSWORD_BYTES) {
      throw new BadRequestException({
        code: 'PASSWORD_TOO_LONG',
        message: 'Password must not exceed 72 UTF-8 bytes',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          status: 'PENDING',
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        message: 'Account created. Email verification is pending.',
        data: user,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email is already registered',
        });
      }

      throw error;
    }
  }
}
