import { Logger } from '@nestjs/common'

export type LoggerContext = 'http' | 'exception' | 'request' | 'upstream'

export function createLogger(
    context: LoggerContext,
    serviceName?: string,
): Logger {
    return new Logger(serviceName ? `${context}:${serviceName}` : context)
}
