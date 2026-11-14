import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import { UpdateUserRoleDto } from '@packages/contracts';
import { IdentityAccessGuard } from '../auth/identity-access.guard.js';
import type { IdentityAuthRequest } from '../auth/identity-access.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

@Controller('admin/users')
@UseGuards(IdentityAccessGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly account: AccountService) {}

  @Patch(':userId/role')
  updateRole(
    @Req() request: IdentityAuthRequest,
    @Param('userId', new ParseUUIDPipe())
    userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.account.updateUserRole(request.auth, userId, dto);
  }
}
