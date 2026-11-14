import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController, AdminUsersController],
  providers: [AuthService, AccessTokenGuard],
})
export class AuthModule {}
