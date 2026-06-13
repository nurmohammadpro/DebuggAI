import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    // Check if user is admin via profiles table
    const { data: profile } = await auth.supabase!
      .from('profiles')
      .select('is_admin')
      .eq('id', auth.userId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden', isAdmin: false },
        { status: 403 },
      );
    }

    return NextResponse.json({ isAdmin: true, userId: auth.userId });
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 },
    );
  }
}
