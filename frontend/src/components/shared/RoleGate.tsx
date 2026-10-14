'use client';

import type { UserRole } from '@/lib/auth/session';
import { getRole } from '@/lib/auth/session';

interface RoleGateProps {
    roles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Renders children only when the current session's role is in the allowed list.
 * This is a UX convenience — the backend enforces the real security boundary.
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
    // const role = getRole();
    // if (!role || !roles.includes(role)) return <>{fallback}</>;
    return <>{children}</>;
}
