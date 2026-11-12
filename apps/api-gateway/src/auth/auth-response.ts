import type { ApiResponse } from '@packages/common';

export interface RegisteredUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
}

export type RegisterResponse = ApiResponse<RegisteredUser>;
