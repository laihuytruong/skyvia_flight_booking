import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { readAuthCookie } from '@packages/common';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

@Controller('admin/users')
@UseGuards(AccessTokenGuard)
export class AdminUsersController {
  constructor(private readonly auth: AuthService) {}

  @Patch(':userId/role')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  updateRole(
    @Req() request: Request,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const token = readAuthCookie(request.headers.cookie, 'ACCESS_TOKEN');

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    return this.auth.forward(
      `/api/v1/admin/users/${userId}/role`,
      'PATCH',
      dto,
      `Bearer ${token}`,
    );
  }
}
