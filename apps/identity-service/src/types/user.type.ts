export interface LockedUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  role: USER_ROLES;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: USER_ROLES;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshId: string;
  expiresAt: Date;
}

export type RefreshResult =
  | {
      ok: true;
      pair: TokenPair;
      user: PublicUser;
    }
  | {
      ok: false;
    };

export interface Session {
  id: string;
  userId: string;
  refreshId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum USER_ROLES {
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
}

export interface LoginClientInfo {
  ipAddress?: string;
  userAgent?: string;
}
