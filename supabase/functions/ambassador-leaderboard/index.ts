/**
 * Ambassador Leaderboard Edge Function
 *
 * Returns top referrers (ambassadors) for the leaderboard.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get top referrers with their referral counts and earnings
    const { data: topReferrers, error } = await supabase
      .rpc('get_ambassador_leaderboard', { limit_count: limit });

    if (error) {
      // Fallback to manual query if RPC doesn't exist
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referrer_id, status, credits_earned')
        .eq('status', 'completed');

      // Aggregate by referrer
      const referrerStats = new Map();

      referrals?.forEach((r: any) => {
        if (!referrerStats.has(r.referrer_id)) {
          referrerStats.set(r.referrer_id, {
            referrer_id: r.referrer_id,
            total_referrals: 0,
            total_credits: 0,
          });
        }
        const stats = referrerStats.get(r.referrer_id);
        stats.total_referrals++;
        stats.total_credits += r.credits_earned;
      });

      // Get profile data for each referrer
      const leaderboard = await Promise.all(
        Array.from(referrerStats.values())
          .sort((a, b) => b.total_referrals - a.total_referrals)
          .slice(0, limit)
          .map(async (stats) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name, avatar_url, metadata')
              .eq('id', stats.referrer_id)
              .single();

            return {
              ...stats,
              email: profile?.email,
              full_name: profile?.full_name,
              avatar_url: profile?.avatar_url,
              ambassador_tier: profile?.metadata?.ambassador_tier,
            };
          })
      );

      return new Response(
        JSON.stringify({ leaderboard }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ leaderboard: topReferrers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Leaderboard error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
