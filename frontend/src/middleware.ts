import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths through
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Check for the auth cookie set by session.ts
    const token = request.cookies.get('gl_token')?.value;
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
