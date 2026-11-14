export interface LockedUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string | null;
  status: string;
  emailVerifiedAt: Date | null;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
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
