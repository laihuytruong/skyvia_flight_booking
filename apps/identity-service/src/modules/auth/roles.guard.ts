import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../generated/prisma/client.js';
import type { IdentityAuthRequest } from './identity-access.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IdentityAuthRequest>();

    if (!request.user || !roles.includes(request.user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
