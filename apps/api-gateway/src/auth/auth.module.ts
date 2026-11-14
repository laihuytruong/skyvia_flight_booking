import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { IdentityServiceClient } from '../clients/identity-service.client.js';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [IdentityServiceClient, AccessTokenGuard],
  exports: [IdentityServiceClient, AccessTokenGuard],
})
export class AuthModule {}
