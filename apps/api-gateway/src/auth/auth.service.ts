import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HTTP_HEADERS, HTTP_STATUS } from '@packages/common';
import type { RegisterResponse } from './auth-response.js';
import { RegisterDto } from './dto/register.dto.js';

function isRegisterResponse(
  value: unknown,
): value is RegisterResponse {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const response = value as Record<string, unknown>;
  const user = response.data;

  if (
    response.success !== true ||
    typeof response.message !== 'string' ||
    typeof user !== 'object' ||
    user === null ||
    Array.isArray(user)
  ) {
    return false;
  }

  const registeredUser = user as Record<string, unknown>;

  return (
    typeof registeredUser.id === 'string' &&
    typeof registeredUser.email === 'string' &&
    typeof registeredUser.fullName === 'string' &&
    typeof registeredUser.status === 'string' &&
    typeof registeredUser.createdAt === 'string'
  );
}

@Injectable()
export class AuthService {
  private readonly identityServiceUrl: string;

  constructor(config: ConfigService) {
    this.identityServiceUrl = config.getOrThrow<string>('IDENTITY_SERVICE_URL');
  }

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const signal = AbortSignal.timeout(5000);

    let response: Response;

    try {
      response = await fetch(
        new URL('/auth/register', this.identityServiceUrl),
        {
          method: 'POST',
          headers: {
            [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          },
          body: JSON.stringify({
            email: dto.email,
            password: dto.password,
            fullName: dto.fullName,
          }),
          signal,
          redirect: 'error',
        },
      );
    } catch {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Identity service response timed out',
        );
      }

      throw new ServiceUnavailableException('Identity service is unavailable');
    }

    if (
      response.status !== HTTP_STATUS.CREATED &&
      response.status !== HTTP_STATUS.BAD_REQUEST &&
      response.status !== HTTP_STATUS.CONFLICT
    ) {
      throw new BadGatewayException(
        'Unexpected response from Identity service',
      );
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Identity service response timed out',
        );
      }

      throw new BadGatewayException('Invalid response from Identity service');
    }

    if (response.status === HTTP_STATUS.CREATED) {
      if (!isRegisterResponse(body)) {
        throw new BadGatewayException(
          'Invalid success response from Identity service',
        );
      }

      return body;
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadGatewayException(
        'Invalid error response from Identity service',
      );
    }

    const errorBody = body as Record<string, unknown>;
    const message = errorBody.message;

    const hasValidMessage =
      typeof message === 'string' ||
      (Array.isArray(message) &&
        message.every((item: unknown) => typeof item === 'string'));

    if (!hasValidMessage) {
      throw new BadGatewayException(
        'Invalid error response from Identity service',
      );
    }

    throw new HttpException(
      {
        statusCode: response.status,
        message,
        ...(typeof errorBody.code === 'string' ? { code: errorBody.code } : {}),
      },
      response.status,
    );
  }
}
