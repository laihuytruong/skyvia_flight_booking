import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthAccountService } from './auth-account.service.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { IdentityAccessGuard } from './identity-access.guard.js';
import type { IdentityAuthRequest } from './identity-access.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

@Controller('admin/users')
@UseGuards(IdentityAccessGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly account: AuthAccountService) {}

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
