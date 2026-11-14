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
import { UpdateUserRoleDto } from '@packages/contracts';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { IdentityServiceClient } from '../clients/identity-service.client.js';

@Controller('admin/users')
@UseGuards(AccessTokenGuard)
export class AdminUsersController {
  constructor(private readonly auth: IdentityServiceClient) {}

  @Patch(':userId/role')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
      `/admin/users/${userId}/role`,
      'PATCH',
      dto,
      `Bearer ${token}`,
    );
  }
}
