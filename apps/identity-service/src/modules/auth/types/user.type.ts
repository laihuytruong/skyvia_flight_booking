import type { UserRole } from '../../../generated/prisma/client.js';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: UserRole;
}
