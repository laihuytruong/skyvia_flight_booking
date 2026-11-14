import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  clearAuthCookies,
  readAuthCookie,
  setAuthCookies,
} from '@packages/common';
import { Throttle } from '@nestjs/throttler';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.forward('/api/v1/auth/register', 'POST', dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.forward('/api/v1/auth/verify-email', 'POST', dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: {
      limit: 3,
      ttl: 60_000,
    },
  })
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.forward(
      '/api/v1/auth/resend-verification',
      'POST',
      dto,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.forward('/api/v1/auth/login', 'POST', dto).then((result) => {
      if (!result.accessToken || !result.refreshToken) {
        throw new Error('Identity service did not return authentication tokens');
      }

      setAuthCookies(
        response,
        result.accessToken,
        result.refreshToken,
        process.env.NODE_ENV === 'production',
      );

      const safeResult = { ...result };
      delete safeResult.accessToken;
      delete safeResult.refreshToken;
      return safeResult;
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  refresh(
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

    return this.auth
      .forward('/api/v1/auth/refresh', 'POST', { refreshToken })
      .then((result) => {
        if (!result.accessToken || !result.refreshToken) {
          throw new Error(
            'Identity service did not return authentication tokens',
          );
        }

        setAuthCookies(
          response,
          result.accessToken,
          result.refreshToken,
          process.env.NODE_ENV === 'production',
        );

        const safeResult = { ...result };
        delete safeResult.accessToken;
        delete safeResult.refreshToken;
        return safeResult;
      });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readAuthCookie(
      request.headers.cookie,
      'REFRESH_TOKEN',
    );

    if (!refreshToken) {
      clearAuthCookies(response, process.env.NODE_ENV === 'production');
      return { message: 'Logged out successfully' };
    }

    return this.auth
      .forward('/api/v1/auth/logout', 'POST', { refreshToken })
      .then((result) => {
        clearAuthCookies(response, process.env.NODE_ENV === 'production');
        return result;
      });
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(
    @Req() request: Request,
    @Headers('authorization')
    authorization: string,
  ) {
    const cookieToken = readAuthCookie(
      request.headers.cookie,
      'ACCESS_TOKEN',
    );

    return this.auth.forward(
      '/api/v1/auth/me',
      'GET',
      undefined,
      cookieToken ? `Bearer ${cookieToken}` : authorization,
    );
  }
}
