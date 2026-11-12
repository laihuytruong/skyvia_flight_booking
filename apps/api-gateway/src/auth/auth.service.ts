import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly identityServiceUrl: string;

  constructor(config: ConfigService) {
    this.identityServiceUrl = config.getOrThrow<string>('IDENTITY_SERVICE_URL');
  }

  async register(dto: RegisterDto): Promise<unknown> {
    const signal = AbortSignal.timeout(5000);

    let response: Response;

    try {
      response = await fetch(
        new URL('/auth/register', this.identityServiceUrl),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
      response.status !== 201 &&
      response.status !== 400 &&
      response.status !== 409
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

    if (response.status === 201) {
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
