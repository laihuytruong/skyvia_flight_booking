export const AUTH_COOKIE_NAMES = {
    ACCESS_TOKEN: 'skyvia_access_token',
    REFRESH_TOKEN: 'skyvia_refresh_token',
} as const

export const AUTH_COOKIE_MAX_AGE_MS = {
    ACCESS_TOKEN: 15 * 60_000,
    REFRESH_TOKEN: 7 * 24 * 60 * 60_000,
} as const

interface CookieResponse {
    cookie(
        name: string,
        value: string,
        options: {
            httpOnly: boolean
            sameSite: 'strict'
            secure: boolean
            maxAge: number
            path: string
        },
    ): unknown
    clearCookie(
        name: string,
        options: {
            httpOnly: boolean
            sameSite: 'strict'
            secure: boolean
            path: string
        },
    ): unknown
}

function parseCookieHeader(header: unknown): Map<string, string> {
    if (typeof header !== 'string') {
        return new Map()
    }

    const cookies = new Map<string, string>()

    for (const part of header.split(';')) {
        const separator = part.indexOf('=')

        if (separator <= 0) {
            continue
        }

        const name = part.slice(0, separator).trim()
        const value = part.slice(separator + 1).trim()

        try {
            cookies.set(name, decodeURIComponent(value))
        } catch {
            continue
        }
    }

    return cookies
}

export function readAuthCookie(
    header: unknown,
    name: keyof typeof AUTH_COOKIE_NAMES,
): string | undefined {
    return parseCookieHeader(header).get(AUTH_COOKIE_NAMES[name])
}

export function setAuthCookies(
    response: CookieResponse,
    accessToken: string,
    refreshToken: string,
    secure: boolean,
): void {
    response.cookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure,
        maxAge: AUTH_COOKIE_MAX_AGE_MS.ACCESS_TOKEN,
        path: '/',
    })

    response.cookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure,
        maxAge: AUTH_COOKIE_MAX_AGE_MS.REFRESH_TOKEN,
        path: '/',
    })
}

export function clearAuthCookies(
    response: CookieResponse,
    secure: boolean,
): void {
    const options = {
        httpOnly: true,
        sameSite: 'strict' as const,
        secure,
        path: '/',
    }

    response.clearCookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN, options)
    response.clearCookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, options)
}
