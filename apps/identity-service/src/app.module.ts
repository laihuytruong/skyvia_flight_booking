import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedHttpModule } from '@packages/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedHttpModule.forRoot('identity-service'),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
