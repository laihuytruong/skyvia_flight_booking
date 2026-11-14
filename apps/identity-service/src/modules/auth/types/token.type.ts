import type { PublicUser } from './user.type.js';

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
