import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module.js';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service.js';
import { IdentityAccessGuard } from './identity-access.guard.js';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, IdentityAccessGuard],
})
export class AuthModule {}
