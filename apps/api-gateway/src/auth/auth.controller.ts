import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  clearAuthCookies,
  readAuthCookie,
  setAuthCookies,
} from '@packages/common';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '@packages/contracts';
import { IdentityServiceClient } from '../clients/identity-service.client.js';

@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: IdentityServiceClient,
    config: ConfigService,
  ) {
    this.secureCookies = config.get<string>('NODE_ENV') === 'production';
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.forward('/auth/register', 'POST', dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.forward('/auth/verify-email', 'POST', dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.forward('/auth/resend-verification', 'POST', dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/auth/login',
      'POST',
      dto,
      undefined,
      {
        ip: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    if (!result.accessToken || !result.refreshToken) {
      throw new Error('Identity service did not return authentication tokens');
    }

    setAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
      this.secureCookies,
    );

    return { message: result.message, data: result.data };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readAuthCookie(
      request.headers.cookie,
      'REFRESH_TOKEN',
    );

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const result = await this.auth.forward('/auth/refresh', 'POST', {
      refreshToken,
    });

    if (!result.accessToken || !result.refreshToken) {
      throw new Error('Identity service did not return authentication tokens');
    }

    setAuthCookies(
      response,
      result.accessToken,
      result.refreshToken,
      this.secureCookies,
    );

    return { message: result.message, data: result.data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const refreshToken = readAuthCookie(
        request.headers.cookie,
        'REFRESH_TOKEN',
      );

      return refreshToken
        ? await this.auth.forward('/auth/logout', 'POST', { refreshToken })
        : { message: 'Logged out successfully' };
    } finally {
      clearAuthCookies(response, this.secureCookies);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forward('/auth/forgot-password', 'POST', dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward('/auth/reset-password', 'POST', dto);
    clearAuthCookies(response, this.secureCookies);
    return result;
  }
}
