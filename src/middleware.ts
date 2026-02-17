import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Allow internal requests to bypass auth check
    if (request.headers.get('x-internal-request') === 'true') {
        return NextResponse.next();
    }

    // Basic check for Authorization header presence on protected routes
    if (request.nextUrl.pathname.startsWith('/api/v1/') &&
        !request.nextUrl.pathname.startsWith('/api/v1/auth/')) {

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/v1/:path*',
};
