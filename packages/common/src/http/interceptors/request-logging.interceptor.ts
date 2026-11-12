import { HttpException, Injectable } from '@nestjs/common'
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs'
import { createLogger } from '../../logging/logger.js'

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger

    constructor(serviceName: string) {
        this.logger = createLogger('request', serviceName)
    }

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>()
        const response = context.switchToHttp().getResponse<Response>()
        const startedAt = performance.now()

        return next.handle().pipe(
            tap({
                next: () => this.logRequest(request, response, startedAt),
                error: (error: unknown) =>
                    this.logRequest(
                        request,
                        response,
                        startedAt,
                        error instanceof HttpException
                            ? error.getStatus()
                            : 500,
                    ),
            }),
        )
    }

    private logRequest(
        request: Request,
        response: Response,
        startedAt: number,
        statusCode = response.statusCode,
    ): void {
        const durationMs = Math.round(performance.now() - startedAt)

        const message = `${request.method} ${request.originalUrl} ${statusCode} ${durationMs}ms`

        if (statusCode >= 500) {
            this.logger.error(message)
        } else if (statusCode >= 400) {
            this.logger.warn(message)
        } else {
            this.logger.log(message)
        }
    }
}
