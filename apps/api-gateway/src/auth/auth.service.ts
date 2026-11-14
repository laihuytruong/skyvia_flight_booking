import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unwrapServiceResponse } from '@packages/common';

@Injectable()
export class AuthService {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('IDENTITY_SERVICE_URL');
  }

  async forward(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: object,
    authorization?: string,
    client?: {
      ip?: string;
      userAgent?: string;
    },
  ) {
    const signal = AbortSignal.timeout(60_000);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    if (authorization) {
      headers.Authorization = authorization;
    }

    if (client?.ip) {
      headers['X-Client-IP'] = client.ip;
    }

    if (client?.userAgent) {
      headers['User-Agent'] = client.userAgent.slice(0, 512);
    }

    let response: Response;

    try {
      response = await fetch(new URL(path, this.baseUrl), {
        method,
        headers,
        ...(body
          ? {
              body: JSON.stringify(body),
            }
          : {}),
        signal,
        redirect: 'error',
      });
    } catch {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Identity service response timed out',
        );
      }

      throw new ServiceUnavailableException('Identity service is unavailable');
    }

    let result: unknown;

    try {
      result = await response.json();
    } catch {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Identity service response timed out',
        );
      }

      throw new BadGatewayException('Invalid response from Identity service');
    }

    return unwrapServiceResponse(result, response.status);
  }
}
