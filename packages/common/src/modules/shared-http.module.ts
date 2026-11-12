import { Module } from '@nestjs/common'
import type { DynamicModule } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ApiExceptionFilter } from '../http/filters/api-exception.filter.js'
import { RequestLoggingInterceptor } from '../http/interceptors/request-logging.interceptor.js'
import { ResponseInterceptor } from '../http/interceptors/response.interceptor.js'
import { createValidationPipe } from '../http/pipes/validation.pipe.js'

@Module({})
export class SharedHttpModule {
    static forRoot(serviceName: string): DynamicModule {
        const normalizedName = serviceName.trim()

        if (!normalizedName) {
            throw new Error('SharedHttpModule requires a service name')
        }

        return {
            module: SharedHttpModule,
            providers: [
                {
                    provide: APP_PIPE,
                    useFactory: createValidationPipe,
                },
                {
                    provide: APP_INTERCEPTOR,
                    useClass: ResponseInterceptor,
                },
                {
                    provide: APP_INTERCEPTOR,
                    useFactory: () =>
                        new RequestLoggingInterceptor(normalizedName),
                },
                {
                    provide: APP_FILTER,
                    useFactory: () => new ApiExceptionFilter(normalizedName),
                },
            ],
        }
    }
}
