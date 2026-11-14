import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [PrismaModule, SessionsModule],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
