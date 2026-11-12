import { BadGatewayException, HttpException } from '@nestjs/common'
import type { ApiResult, Pagination } from '../../types/api-response.js'
import { HTTP_MESSAGES } from '../../constants/http.constants.js'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
    return value == null || typeof value === 'string'
}

function isPagination(value: unknown): value is Pagination {
    if (!isRecord(value)) {
        return false
    }

    return (
        typeof value.totalPages === 'number' &&
        Number.isInteger(value.totalPages) &&
        value.totalPages >= 0 &&
        typeof value.page === 'number' &&
        Number.isInteger(value.page) &&
        value.page >= 1 &&
        typeof value.limit === 'number' &&
        Number.isInteger(value.limit) &&
        value.limit >= 1 &&
        typeof value.hasNextPage === 'boolean' &&
        typeof value.hasPrevPage === 'boolean'
    )
}

export function unwrapServiceResponse(
    body: unknown,
    statusCode: number,
): ApiResult {
    if (
        !isRecord(body) ||
        typeof body.success !== 'boolean' ||
        typeof body.message !== 'string'
    ) {
        throw new BadGatewayException(HTTP_MESSAGES.INVALID_UPSTREAM_RESPONSE)
    }

    const isSuccessfulStatus = statusCode >= 200 && statusCode < 300

    if (body.success !== isSuccessfulStatus) {
        throw new BadGatewayException(
            HTTP_MESSAGES.INCONSISTENT_UPSTREAM_RESPONSE,
        )
    }

    if (!body.success) {
        throw new HttpException(
            {
                message: body.message,
                errors: body.errors,
                path: body.path,
            },
            statusCode,
        )
    }

    if (
        (body.listData != null && !Array.isArray(body.listData)) ||
        !isOptionalString(body.accessToken) ||
        !isOptionalString(body.refreshToken) ||
        (body.pagination != null && !isPagination(body.pagination))
    ) {
        throw new BadGatewayException(
            HTTP_MESSAGES.INVALID_UPSTREAM_DATA,
        )
    }

    const result: ApiResult = {
        message: body.message,
    }

    if (body.data != null) {
        result.data = body.data
    }

    if (Array.isArray(body.listData)) {
        result.listData = body.listData
    }

    if (typeof body.accessToken === 'string') {
        result.accessToken = body.accessToken
    }

    if (typeof body.refreshToken === 'string') {
        result.refreshToken = body.refreshToken
    }

    if (isPagination(body.pagination)) {
        result.pagination = body.pagination
    }

    return result
}
