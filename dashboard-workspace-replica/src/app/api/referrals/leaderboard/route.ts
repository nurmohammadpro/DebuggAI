/**
 * Ambassador Leaderboard API Route
 *
 * Proxies to the edge function.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call edge function
    const { data, error } = await supabase.functions.invoke('ambassador-leaderboard', {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: {
        limit: 50,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
