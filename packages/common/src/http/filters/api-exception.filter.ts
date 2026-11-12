import { Catch, HttpException, HttpStatus } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { STATUS_CODES } from 'node:http'
import type { Request, Response } from 'express'
import type { ApiResponse, FieldErrors } from '../../types/api-response.js'
import { createLogger } from '../../logging/logger.js'
import { HTTP_MESSAGES } from '../../constants/http.constants.js'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.every((item: unknown) => typeof item === 'string')
    )
}

function extractFieldErrors(value: unknown): FieldErrors | undefined {
    if (!isRecord(value)) {
        return undefined
    }

    const entries: Array<[string, string[]]> = []

    for (const [field, messages] of Object.entries(value)) {
        if (isStringArray(messages) && messages.length > 0) {
            entries.push([field, messages])
        }
    }

    return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger

    constructor(private readonly serviceName: string) {
        this.logger = createLogger('exception', serviceName)
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp()
        const request = http.getRequest<Request>()
        const response = http.getResponse<Response>()

        const statusCode =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR

        let message = STATUS_CODES[statusCode] ?? HTTP_MESSAGES.REQUEST_FAILED

        let errors: FieldErrors | undefined
        let path = this.serviceName

        if (exception instanceof HttpException) {
            const exceptionBody: unknown = exception.getResponse()

            if (isRecord(exceptionBody)) {
                if (
                    typeof exceptionBody.path === 'string' &&
                    exceptionBody.path.trim().length > 0
                ) {
                    path = exceptionBody.path
                }

                if (statusCode < 500) {
                    if (typeof exceptionBody.message === 'string') {
                        message = exceptionBody.message
                    } else if (isStringArray(exceptionBody.message)) {
                        message = HTTP_MESSAGES.VALIDATION_FAILED

                        if (exceptionBody.message.length > 0) {
                            errors = {
                                _global: exceptionBody.message,
                            }
                        }
                    }

                    errors = extractFieldErrors(exceptionBody.errors) ?? errors
                }
            } else if (typeof exceptionBody === 'string' && statusCode < 500) {
                message = exceptionBody
            }
        }

        if (statusCode >= 500) {
            this.logger.error(
                `${request.method} ${request.path} failed; status=${statusCode}; source=${path}`,
            )
        }

        if (response.headersSent) {
            return
        }

        const body: ApiResponse<never, never> = {
            message,
            success: false,
            path,
        }

        if (errors) {
            body.errors = errors
        }

        response.status(statusCode).json(body)
    }
}
