import { Injectable } from '@nestjs/common'
import type {
    CallHandler,
    ExecutionContext,
    NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { map } from 'rxjs'
import type { Observable } from 'rxjs'
import type { ApiResponse, ApiResult } from '../../types/api-response.js'
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js'
import { HTTP_MESSAGES } from '../../constants/http.constants.js'

@Injectable()
export class ResponseInterceptor<
    T = unknown,
    L = unknown,
> implements NestInterceptor<ApiResult<T, L>, ApiResponse<T, L>> {
    constructor(private readonly reflector: Reflector) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler<ApiResult<T, L>>,
    ): Observable<ApiResponse<T, L>> {
        const responseMessage = this.reflector.getAllAndOverride<string>(
            RESPONSE_MESSAGE_KEY,
            [context.getHandler(), context.getClass()],
        )

        return next.handle().pipe(
            map((result): ApiResponse<T, L> => {
                const response: ApiResponse<T, L> = {
                    message:
                        responseMessage ??
                        result.message ??
                        HTTP_MESSAGES.SUCCESS,
                    success: true,
                }

                if (result.data != null) {
                    response.data = result.data
                }

                if (result.listData != null) {
                    response.listData = result.listData
                }

                if (result.accessToken != null) {
                    response.accessToken = result.accessToken
                }

                if (result.refreshToken != null) {
                    response.refreshToken = result.refreshToken
                }

                if (result.pagination != null) {
                    response.pagination = result.pagination
                }

                return response
            }),
        )
    }
}
