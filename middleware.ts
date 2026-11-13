import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_APP_PATHS = [
  '/onboarding',
  '/payroll',
  '/tax-optimization',
  '/ai-assistant',
  '/reports',
  '/declaration',
  '/echeances',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce authentication redirect on app routes when FISCALIQ_REQUIRE_AUTH=true
  if (
    process.env.FISCALIQ_REQUIRE_AUTH === 'true' &&
    PROTECTED_APP_PATHS.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    const sessionCookie = request.cookies.get('fiscaliq_session')?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/onboarding/:path*',
    '/payroll/:path*',
    '/tax-optimization/:path*',
    '/ai-assistant/:path*',
    '/reports/:path*',
    '/declaration/:path*',
    '/echeances/:path*',
    '/settings/:path*',
  ],
};
