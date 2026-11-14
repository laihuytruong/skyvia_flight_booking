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
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  clearAuthCookies,
  readAuthCookie,
  setAuthCookies,
} from '@packages/common';
import { AccessTokenGuard } from './access-token.guard.js';
import type { GatewayAuthRequest } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SessionQueryDto } from './dto/session-query.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.secureCookies = config.get<string>('NODE_ENV') === 'production';
  }

  private authorization(request: Request): string {
    const token = readAuthCookie(request.headers.cookie, 'ACCESS_TOKEN');

    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    return `Bearer ${token}`;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.forward('/api/v1/auth/register', 'POST', dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.forward('/api/v1/auth/verify-email', 'POST', dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.forward('/api/v1/auth/resend-verification', 'POST', dto);
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
      '/api/v1/auth/login',
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

    const result = await this.auth.forward('/api/v1/auth/refresh', 'POST', {
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

      if (refreshToken) {
        return await this.auth.forward('/api/v1/auth/logout', 'POST', {
          refreshToken,
        });
      }

      return { message: 'Logged out successfully' };
    } finally {
      clearAuthCookies(response, this.secureCookies);
    }
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() request: Request) {
    return this.auth.forward(
      '/api/v1/auth/me',
      'GET',
      undefined,
      this.authorization(request),
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forward('/api/v1/auth/forgot-password', 'POST', dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/api/v1/auth/reset-password',
      'POST',
      dto,
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @Req() request: Request,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/api/v1/auth/change-password',
      'POST',
      dto,
      this.authorization(request),
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async logoutAll(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/api/v1/auth/logout-all',
      'POST',
      undefined,
      this.authorization(request),
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }

  @Get('sessions')
  @UseGuards(AccessTokenGuard)
  sessions(@Req() request: Request, @Query() query: SessionQueryDto) {
    const params = new URLSearchParams({
      limit: String(query.limit ?? 20),
    });

    params.set('page', String(query.page ?? 1));

    return this.auth.forward(
      `/api/v1/auth/sessions?${params.toString()}`,
      'GET',
      undefined,
      this.authorization(request),
    );
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async revokeSession(
    @Req() request: GatewayAuthRequest,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      `/api/v1/auth/sessions/${sessionId}`,
      'DELETE',
      undefined,
      this.authorization(request),
    );

    if (sessionId === request.auth.sid) {
      clearAuthCookies(response, this.secureCookies);
    }

    return result;
  }
}
