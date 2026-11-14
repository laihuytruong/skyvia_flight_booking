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
import type { Request, Response } from 'express';
import { clearAuthCookies, readAuthCookie } from '@packages/common';
import { ChangePasswordDto, SessionQueryDto } from '@packages/contracts';
import { IdentityServiceClient } from '../clients/identity-service.client.js';
import { AccessTokenGuard } from '../auth/access-token.guard.js';

@Controller('users')
@UseGuards(AccessTokenGuard)
export class UsersController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: IdentityServiceClient,
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

  @Get('me')
  me(@Req() request: Request) {
    return this.auth.forward('/users/me', 'GET', undefined, this.authorization(request));
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() request: Request,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/users/change-password',
      'POST',
      dto,
      this.authorization(request),
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      '/users/logout-all',
      'POST',
      undefined,
      this.authorization(request),
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }

  @Get('sessions')
  sessions(@Req() request: Request, @Query() query: SessionQueryDto) {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 10),
    });
    return this.auth.forward(
      `/users/sessions?${params.toString()}`,
      'GET',
      undefined,
      this.authorization(request),
    );
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Req() request: Request,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.forward(
      `/users/sessions/${sessionId}`,
      'DELETE',
      undefined,
      this.authorization(request),
    );
    clearAuthCookies(response, this.secureCookies);
    return result;
  }
}
