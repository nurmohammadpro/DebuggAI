import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Query Supabase for user profile (credits, plan, admin status)
  // The user is identified by clerk_id matching the old Supabase user.id
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(supabaseUrl, serviceKey);

      // Try to find user by clerk_id first, then fall back to matching by id
      const { data: profiles } = await admin
        .from('profiles')
        .select('plan_type, is_admin')
        .or(`id.eq.${userId},clerk_id.eq.${userId}`)
        .limit(1);

      const profile = profiles?.[0];

      const { data: wallet } = await admin
        .from('credit_wallets')
        .select('balance')
        .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        clerkId: userId,
        credits: wallet?.balance ?? 0,
        plan: profile?.plan_type ?? 'free',
        isAdmin: profile?.is_admin ?? false,
      });
    }

    return NextResponse.json({
      clerkId: userId,
      credits: 0,
      plan: 'free',
      isAdmin: false,
    });
  } catch {
    return NextResponse.json({
      clerkId: userId,
      credits: 0,
      plan: 'free',
      isAdmin: false,
    });
  }
}
