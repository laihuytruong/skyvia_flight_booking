import { IsEnum } from 'class-validator';

export enum USER_ROLES {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
}

export class UpdateUserRoleDto {
  @IsEnum(USER_ROLES, { message: 'Invalid role' })
  role: USER_ROLES;
}
