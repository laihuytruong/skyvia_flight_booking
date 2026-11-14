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
import { isIP } from 'node:net';
import type { Request } from 'express';
import { AuthAccountService } from './auth-account.service.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SessionQueryDto } from './dto/session-query.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { IdentityAccessGuard } from './identity-access.guard.js';
import type { IdentityAuthRequest } from './identity-access.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AuthAccountService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    const forwardedIp = request.get('x-client-ip');

    const ipAddress =
      forwardedIp && isIP(forwardedIp)
        ? forwardedIp
        : request.ip && isIP(request.ip)
          ? request.ip
          : undefined;

    return this.auth.login(dto, {
      ipAddress,
      userAgent: request.get('user-agent'),
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(IdentityAccessGuard)
  me(@Req() request: IdentityAuthRequest) {
    return this.auth.me(request.auth);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IdentityAccessGuard)
  changePassword(
    @Req() request: IdentityAuthRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.account.changePassword(request.auth, dto);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IdentityAccessGuard)
  logoutAll(@Req() request: IdentityAuthRequest) {
    return this.account.logoutAll(request.auth);
  }

  @Get('sessions')
  @UseGuards(IdentityAccessGuard)
  sessions(
    @Req() request: IdentityAuthRequest,
    @Query() query: SessionQueryDto,
  ) {
    return this.account.listSessions(request.auth, query);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IdentityAccessGuard)
  revokeSession(
    @Req() request: IdentityAuthRequest,
    @Param('sessionId', new ParseUUIDPipe())
    sessionId: string,
  ) {
    return this.account.revokeSession(request.auth, sessionId);
  }
}
