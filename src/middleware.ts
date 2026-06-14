import { NextResponse, type NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey || clerkKey.length < 20) return NextResponse.next();

  try {
    const { clerkMiddleware } = await import('@clerk/nextjs/server');
    const handler = (clerkMiddleware as any)(async (auth: any, _req: any) => {
      const { userId } = await auth();
      const { pathname } = req.nextUrl;
      if (!userId && pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirect', pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    });
    return handler(req);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
