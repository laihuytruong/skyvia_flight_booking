export type {
    ApiResponse,
    ApiResult,
    Pagination,
    FieldErrors,
} from './types/api-response.js'

export {
    DEFAULT_API_PREFIX,
    HTTP_HEADERS,
    HTTP_MESSAGES,
    HTTP_STATUS,
} from './constants/http.constants.js'

export { createValidationPipe } from './http/pipes/validation.pipe.js'

export { createLogger } from './logging/logger.js'
export type { LoggerContext } from './logging/logger.js'

export { ResponseMessage } from './http/decorators/response-message.decorator.js'

export { ResponseInterceptor } from './http/interceptors/response.interceptor.js'

export { RequestLoggingInterceptor } from './http/interceptors/request-logging.interceptor.js'

export { ApiExceptionFilter } from './http/filters/api-exception.filter.js'

export { validationExceptionFactory } from './http/pipes/validation-exception.factory.js'

export { unwrapServiceResponse } from './http/utils/unwrap-service-response.js'

export { SharedHttpModule } from './modules/shared-http.module.js'

export {
    parseAuthClaims,
    readBearerToken,
    loadRsaPublicKey,
    loadRsaKeyPair,
} from './utils/jwt.util.js'

export type { AuthClaims, TokenUse } from './utils/jwt.util.js'

export {
    AUTH_COOKIE_NAMES,
    AUTH_COOKIE_MAX_AGE_MS,
    clearAuthCookies,
    readAuthCookie,
    setAuthCookies,
} from './utils/auth-cookie.util.js'
