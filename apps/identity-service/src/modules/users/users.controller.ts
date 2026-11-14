import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import {
  ChangePasswordDto,
  SessionQueryDto,
} from '@packages/contracts';
import { AuthService } from '../auth/auth.service.js';
import { IdentityAccessGuard } from '../auth/identity-access.guard.js';
import type { IdentityAuthRequest } from '../auth/identity-access.guard.js';

@Controller('users')
@UseGuards(IdentityAccessGuard)
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService,
  ) {}

  @Get('me')
  me(@Req() request: IdentityAuthRequest) {
    return this.auth.me(request.auth);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Req() request: IdentityAuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.account.changePassword(request.auth, dto);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@Req() request: IdentityAuthRequest) {
    return this.account.logoutAll(request.auth);
  }

  @Get('sessions')
  sessions(
    @Req() request: IdentityAuthRequest,
    @Query() query: SessionQueryDto,
  ) {
    return this.account.listSessions(request.auth, query);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @Req() request: IdentityAuthRequest,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.account.revokeSession(request.auth, sessionId);
  }
}
