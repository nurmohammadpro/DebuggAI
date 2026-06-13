import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Public paths — no auth required
  const PUBLIC_PATHS = ['/login', '/signup', '/reset-password', '/verify-email', '/auth/callback'];
  const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon.ico', '/pricing', '/features', '/demo', '/', '/debuggai-dark.svg', '/DebuggAI-Dark.svg'];

  const isPublic = PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p));

  if (!userId && !isPublic && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/sign-in', req.url);
    loginUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && pathname.startsWith('/sign-in')) {
    return NextResponse.redirect(new URL('/dashboard/home', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
