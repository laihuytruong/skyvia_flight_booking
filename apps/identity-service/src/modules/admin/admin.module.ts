import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AdminUsersController } from './admin-users.controller.js';
import { IdentityAccessGuard } from '../auth/identity-access.guard.js';
import { RolesGuard } from './roles.guard.js';
import { AccountModule } from '../account/account.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, AccountModule, SessionsModule],
  controllers: [AdminUsersController],
  providers: [IdentityAccessGuard, RolesGuard],
})
export class AdminModule {}
