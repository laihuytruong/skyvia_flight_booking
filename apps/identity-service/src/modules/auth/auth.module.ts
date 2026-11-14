import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module.js';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service.js';
import { IdentityAccessGuard } from './identity-access.guard.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthAccountService } from './auth-account.service.js';
import { AdminUsersController } from './admin-users.controller.js';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, JwtModule.register({})],
  controllers: [AuthController, AdminUsersController],
  providers: [
    AuthService,
    AuthAccountService,
    TokenService,
    IdentityAccessGuard,
    AuthSessionService,
  ],
})
export class AuthModule {}
