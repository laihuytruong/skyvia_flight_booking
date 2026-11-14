import { IsEnum } from 'class-validator';
import { USER_ROLES } from '../../../types/user.type.js';

export class UpdateUserRoleDto {
  @IsEnum(USER_ROLES, { message: 'Invalid role' })
  role: USER_ROLES;
}
