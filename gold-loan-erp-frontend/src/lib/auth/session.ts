/**
 * Session storage — stores JWT + user info in localStorage.
 * Also sets/reads a cookie so Next.js middleware can gate routes server-side.
 */

export type UserRole = 'OWNER' | 'MANAGER' | 'APPRAISER' | 'CASHIER' | 'STAFF';

export interface SessionUser {
    id: string;
    employeeCode: string;
    name: string;
    role: UserRole;
}

export interface Session {
    accessToken: string;
    user: SessionUser;
}

const SESSION_KEY = 'gl_session';
const COOKIE_NAME = 'gl_token';

export function setSession(session: Session): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Also set a cookie for middleware route protection
    document.cookie = `${COOKIE_NAME}=${session.accessToken}; path=/; SameSite=Lax`;
}

export function getSession(): Session | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Session;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_KEY);
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getRole(): UserRole | null {
    return getSession()?.user.role ?? null;
}

export function hasRole(roles: UserRole[]): boolean {
    const role = getRole();
    if (!role) return false;
    return roles.includes(role);
}
