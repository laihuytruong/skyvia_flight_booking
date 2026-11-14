export interface LockedUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  role: UserRole;
}

export interface Session {
  id: string;
  userId: string;
  refreshId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}
import type { UserRole } from '../../../generated/prisma/client.js';
