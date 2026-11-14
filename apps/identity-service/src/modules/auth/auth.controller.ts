import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { isIP } from 'node:net';
import type { Request } from 'express';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '@packages/contracts';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

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
}
