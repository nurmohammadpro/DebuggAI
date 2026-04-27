/**
 * Admin Middleware
 *
 * Protects admin routes with authentication and authorization checks.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PATHS = ['/admin', '/admin/'];

const PUBLIC_PATHS = ['/login', '/signin'];

export async function adminMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is an admin route
  const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

  if (!isAdminPath) {
    return NextResponse.next();
  }

  // Allow public admin paths
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check for admin session
  const accessToken = request.cookies.get('sb-access-token')?.value;

  if (!accessToken) {
    // Redirect to admin login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify admin status
  try {
    const response = await fetch(
      new URL('/api/admin/verify', request.url),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { isAdmin } = await response.json();

    if (!isAdmin) {
      // User is authenticated but not an admin
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Admin middleware error:', error);

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}
