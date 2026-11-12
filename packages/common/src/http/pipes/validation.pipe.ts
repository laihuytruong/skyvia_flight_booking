import { ValidationPipe } from '@nestjs/common'
import { validationExceptionFactory } from './validation-exception.factory.js'

export function createValidationPipe(): ValidationPipe {
    return new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: {
            target: false,
            value: false,
        },
        exceptionFactory: validationExceptionFactory,
    })
}
