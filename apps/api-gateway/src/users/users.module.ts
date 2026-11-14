import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [ConfigModule, JwtModule.register({}), AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
