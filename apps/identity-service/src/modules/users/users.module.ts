import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AuthModule, AccountModule],
  controllers: [UsersController],
})
export class UsersModule {}
