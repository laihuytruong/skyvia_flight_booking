import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminUsersController } from './admin-users.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
})
export class AdminModule {}
