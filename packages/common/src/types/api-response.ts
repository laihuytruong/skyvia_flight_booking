export type FieldErrors = Record<string, string[]>

export interface Pagination {
    totalPages: number
    page: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
}

export interface ApiResult<T = unknown, L = unknown> {
    message?: string
    data?: T | null
    listData?: L[] | null
    accessToken?: string | null
    refreshToken?: string | null
    pagination?: Pagination | null
}

export interface ApiResponse<T = unknown, L = unknown> {
    message: string
    success: boolean
    data?: T
    listData?: L[]
    accessToken?: string
    refreshToken?: string
    pagination?: Pagination
    errors?: FieldErrors
    path?: string
}
