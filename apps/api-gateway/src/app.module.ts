import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SharedHttpModule } from '@packages/common';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedHttpModule.forRoot('api-gateway'),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    AuthModule,
    UsersModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
