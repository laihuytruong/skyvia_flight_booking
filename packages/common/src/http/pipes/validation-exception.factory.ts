import { BadRequestException } from '@nestjs/common'
import type { ValidationError } from 'class-validator'
import type { FieldErrors } from '../../types/api-response.js'
import { HTTP_MESSAGES } from '../../constants/http.constants.js'

function collectFieldErrors(
    validationErrors: ValidationError[],
    result: Map<string, string[]>,
    parent = '',
): void {
    for (const error of validationErrors) {
        const field = parent ? `${parent}.${error.property}` : error.property

        if (error.constraints) {
            const messages = Object.values(error.constraints)
            const existingMessages = result.get(field) ?? []

            result.set(field, [...existingMessages, ...messages])
        }

        if (error.children?.length) {
            collectFieldErrors(error.children, result, field)
        }
    }
}

export function validationExceptionFactory(
    validationErrors: ValidationError[],
): BadRequestException {
    const collected = new Map<string, string[]>()

    collectFieldErrors(validationErrors, collected)

    const errors: FieldErrors = Object.fromEntries(collected)

    return new BadRequestException({
        message: HTTP_MESSAGES.VALIDATION_FAILED,
        errors,
    })
}
