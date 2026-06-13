import { NextResponse, type NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey || clerkKey.length < 20) return NextResponse.next();

  try {
    const { clerkMiddleware } = await import('@clerk/nextjs/server');
    // @ts-expect-error - dynamic import, handler signature varies by Clerk version
    const handler = (clerkMiddleware as any)(async (auth: any, _req: any) => {
      const { userId } = await auth();
      const { pathname } = req.nextUrl;
      if (!userId && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/signin', req.url));
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
