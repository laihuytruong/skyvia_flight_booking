import { IsEnum } from 'class-validator';

export enum USER_ROLES {
  CUSTOMER = 'CUSTOMER',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
}

export class UpdateUserRoleDto {
  @IsEnum(USER_ROLES, { message: 'Invalid role' })
  role!: USER_ROLES;
}
