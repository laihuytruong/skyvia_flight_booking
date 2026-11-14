import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module.js';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service.js';
import { IdentityAccessGuard } from './identity-access.guard.js';
import { SessionsModule } from '../sessions/sessions.module.js';

@Module({
  imports: [
    ConfigModule,
    MailModule,
    JwtModule.register({}),
    SessionsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    IdentityAccessGuard,
  ],
  exports: [AuthService, TokenService, IdentityAccessGuard],
})
export class AuthModule {}
