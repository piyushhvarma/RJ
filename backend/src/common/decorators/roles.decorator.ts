import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marks an endpoint as restricted to the given roles.
 * Enforced by RolesGuard — server-side only. The PRD is explicit (§85):
 * "Frontend hiding buttons is not security." Every privileged action must
 * check this on the backend regardless of what the UI shows.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
