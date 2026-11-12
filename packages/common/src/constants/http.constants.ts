export const DEFAULT_API_PREFIX = 'api/v1'

export const HTTP_HEADERS = {
    CONTENT_TYPE: 'Content-Type',
    CORRELATION_ID: 'X-Correlation-Id',
} as const

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const

export const HTTP_MESSAGES = {
    SUCCESS: 'Success',
    REQUEST_FAILED: 'Request failed',
    VALIDATION_FAILED: 'Validation failed',
    INVALID_UPSTREAM_RESPONSE: 'Invalid response from upstream service',
    INCONSISTENT_UPSTREAM_RESPONSE:
        'Inconsistent response from upstream service',
    INVALID_UPSTREAM_DATA: 'Invalid response data from upstream service',
} as const
