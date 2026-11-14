import { createPrivateKey, createPublicKey } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isUUID } from 'class-validator'

export type TokenUse = 'access' | 'refresh'

export interface AuthClaims {
    sub: string
    sid: string
    jti: string
    tokenUse: TokenUse
    iat: number
    exp: number
}

export function parseAuthClaims(
    value: unknown,
    expectedUse: TokenUse,
): AuthClaims {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid JWT claims')
    }

    const payload = value as Record<string, unknown>
    const now = Math.floor(Date.now() / 1000)

    if (
        typeof payload.sub !== 'string' ||
        !isUUID(payload.sub) ||
        typeof payload.sid !== 'string' ||
        !isUUID(payload.sid) ||
        typeof payload.jti !== 'string' ||
        !isUUID(payload.jti) ||
        payload.tokenUse !== expectedUse ||
        typeof payload.iat !== 'number' ||
        !Number.isSafeInteger(payload.iat) ||
        typeof payload.exp !== 'number' ||
        !Number.isSafeInteger(payload.exp) ||
        payload.iat > now + 5 ||
        payload.exp <= now ||
        payload.exp <= payload.iat
    ) {
        throw new Error('Invalid JWT claims')
    }

    return {
        sub: payload.sub,
        sid: payload.sid,
        jti: payload.jti,
        tokenUse: expectedUse,
        iat: payload.iat,
        exp: payload.exp,
    }
}

export function readBearerToken(authorization: unknown): string {
    if (typeof authorization !== 'string' || authorization.length > 9000) {
        throw new Error('Invalid authorization header')
    }

    const match = /^Bearer\s+(\S+)$/i.exec(authorization)

    if (!match) {
        throw new Error('Invalid authorization header')
    }

    return match[1]
}

export function loadRsaPublicKey(path: string): string {
    const pem = readFileSync(resolve(path), 'utf8')
    const key = createPublicKey(pem)

    if (
        key.asymmetricKeyType !== 'rsa' ||
        (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
        throw new Error('Invalid RSA public key')
    }

    return pem
}

export function loadRsaKeyPair(
    privatePath: string,
    publicPath: string,
): {
    privateKey: string
    publicKey: string
} {
    const privateKey = readFileSync(resolve(privatePath), 'utf8')

    const publicKey = loadRsaPublicKey(publicPath)

    const privateObject = createPrivateKey(privateKey)

    if (privateObject.asymmetricKeyType !== 'rsa') {
        throw new Error('Invalid RSA private key')
    }

    const derivedPublic = createPublicKey(privateObject).export({
        type: 'spki',
        format: 'pem',
    })

    const configuredPublic = createPublicKey(publicKey).export({
        type: 'spki',
        format: 'pem',
    })

    if (String(derivedPublic) !== String(configuredPublic)) {
        throw new Error('RSA key pair does not match')
    }

    return {
        privateKey,
        publicKey,
    }
}
