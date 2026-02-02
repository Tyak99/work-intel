import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'work_intel_session';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/nylas/initiate',
  '/api/auth/nylas/callback',
  '/api/auth/google-drive/callback',
];

// API routes that require authentication
const PROTECTED_API_PREFIXES = [
  '/api/brief',
  '/api/tasks',
  '/api/tools',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check protected API routes
  if (PROTECTED_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Check auth API routes (me, logout)
  if (pathname.startsWith('/api/auth/me') || pathname.startsWith('/api/auth/logout')) {
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // For page routes, redirect to login if no session
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
