import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCsrfToken, getCsrfCookieHeader, validateCsrfToken, requiresCsrfValidation } from '@/lib/server/csrf';

const PUBLIC_PATHS = ['/login', '/signup', '/reset-password', '/verify-email', '/auth/callback'];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers
  const response = NextResponse.next();

  // The app embeds same-origin iframes for workspace previews under /preview/*.
  // DENY breaks that flow; SAMEORIGIN preserves clickjacking protection while allowing our own iframe usage.
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Strict-Transport-Security (HSTS) — also set by Caddy, but defense-in-depth
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content-Security-Policy
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const appOrigin = appUrl ? new URL(appUrl).origin : '';

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Monaco requires 'unsafe-eval' and blob: workers. Cloudflare Insights uses static.cloudflareinsights.com.
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com blob:",
      "script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.deepseek.com https://api.openai.com https://api.anthropic.com https://static.cloudflareinsights.com ws://localhost:* wss://*.supabase.co https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      `frame-src 'self' http://localhost:* ${appOrigin}`.trim(),
      "frame-ancestors 'self'",
    ].join('; ')
  );

  // Set CSRF token cookie on every response that doesn't already have one.
  // The client reads this cookie and sends it back as an X-CSRF-Token header on
  // state-changing requests. Combined with SameSite=Strict this prevents CSRF.
  if (!request.cookies.get('csrf_token')?.value) {
    const csrfToken = generateCsrfToken();
    response.headers.set('Set-Cookie', getCsrfCookieHeader(csrfToken));
  }

  // CSRF validation for state-changing API routes.
  // Read-only methods (GET, HEAD, OPTIONS) are excluded.
  if (pathname.startsWith('/api/') && requiresCsrfValidation(request)) {
    // Skip CSRF check for Stripe webhooks (external caller) and health endpoints.
    const skipCsrfPaths = ['/api/health', '/api/contact', '/api/newsletter'];
    const isSkipPath = skipCsrfPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (!isSkipPath && !validateCsrfToken(request)) {
      return new NextResponse(JSON.stringify({ error: { code: 'CSRF_ERROR', message: 'CSRF token missing or invalid' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Auth guard for dashboard routes.
  // /dashboard/admin* is excluded because admin routes have their own server-side
  // guard (requireAdmin) and client-side guard (AdminRouteGuard component).
  if (pathname.startsWith('/dashboard') && !isPublicPath(pathname) && !pathname.startsWith('/dashboard/admin')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // middleware only reads — cookies are set by the browser client
          },
          remove(name: string) {
            response.cookies.set(name, '', { maxAge: 0, path: '/' });
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
