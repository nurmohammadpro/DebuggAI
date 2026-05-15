/**
 * Track Referral Edge Function
 *
 * Processes referral when a new user signs up with a referral code.
 * Awards credits to both referrer and referee.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Referral rewards
const REFERRER_REWARD = 10; // Credits for referrer
const REFEREE_REWARD = 5; // Credits for new user

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request
    const { referralCode } = await req.json();

    if (!referralCode) {
      return new Response(
        JSON.stringify({ error: 'Referral code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find referral by code
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('code', referralCode)
      .single();

    if (referralError || !referral) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed
    if (referral.status === 'completed' || referral.referee_id) {
      return new Response(
        JSON.stringify({ error: 'Referral code already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-referral
    if (referral.referrer_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot use your own referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update referral record
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        referee_id: user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        credits_earned: REFERRER_REWARD,
      })
      .eq('id', referral.id);

    if (updateError) {
      throw updateError;
    }

    // 5. Award credits to referrer
    const { data: referrerWallet } = await supabase
      .from('credit_wallets')
      .select('id, balance')
      .eq('user_id', referral.referrer_id)
      .single();

    if (referrerWallet) {
      await supabase
        .from('credit_wallets')
        .update({ balance: referrerWallet.balance + REFERRER_REWARD })
        .eq('id', referrerWallet.id);

      // Record transaction for referrer
      await supabase
        .from('credit_transactions')
        .insert({
          wallet_id: referrerWallet.id,
          amount: REFERRER_REWARD,
          type: 'referral_bonus',
          description: `Referral bonus: ${user.email} signed up with your code`,
          metadata: { source: 'referral' },
        });

      // Create notification for referrer
      await supabase
        .from('notifications')
        .insert({
          user_id: referral.referrer_id,
          type: 'success',
          title: 'Referral Bonus',
          body: `You earned ${REFERRER_REWARD} credits for referring ${user.email}.`,
        });
    }

    // 6. Award bonus credits to new user (referee)
    const { data: refereeWallet } = await supabase
      .from('credit_wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (refereeWallet) {
      await supabase
        .from('credit_wallets')
        .update({ balance: refereeWallet.balance + REFEREE_REWARD })
        .eq('id', refereeWallet.id);

      // Record transaction for referee
      await supabase
        .from('credit_transactions')
        .insert({
          wallet_id: refereeWallet.id,
          amount: REFEREE_REWARD,
          type: 'referral_bonus',
          description: 'Welcome bonus for signing up with a referral code',
          metadata: { source: 'referral_bonus' },
        });
    }

    // 7. Check for ambassador milestone
    await checkAmbassadorMilestone(supabase, referral.referrer_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Referral applied! You earned ${REFEREE_REWARD} bonus credits.`,
        referrerReward: REFERRER_REWARD,
        refereeReward: REFEREE_REWARD,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Referral tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Check if referrer qualifies for ambassador status
 * and award bonus rewards
 */
async function checkAmbassadorMilestone(
  supabase: any,
  referrerId: string
): Promise<void> {
  // Count completed referrals
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrerId)
    .eq('status', 'completed');

  if (error || !referrals) return;

  const referralCount = referrals.length;

  // Ambassador tiers and their bonuses
  const ambassadorTiers = [
    { referrals: 5, bonus: 25, tier: 'bronze' },
    { referrals: 10, bonus: 50, tier: 'silver' },
    { referrals: 25, bonus: 150, tier: 'gold' },
    { referrals: 50, bonus: 350, tier: 'platinum' },
    { referrals: 100, bonus: 1000, tier: 'diamond' },
  ];

  // Check if user just hit a milestone
  for (const milestone of ambassadorTiers) {
    if (referralCount === milestone.referrals) {
      // Get user's wallet
      const { data: wallet } = await supabase
        .from('credit_wallets')
        .select('id, balance')
        .eq('user_id', referrerId)
        .single();

      if (wallet) {
        // Award milestone bonus
        await supabase
          .from('credit_wallets')
          .update({ balance: wallet.balance + milestone.bonus })
          .eq('id', wallet.id);

        // Record transaction
        await supabase
          .from('credit_transactions')
          .insert({
            wallet_id: wallet.id,
            amount: milestone.bonus,
            type: 'referral_bonus',
            description: `Ambassador milestone: ${milestone.tier.toUpperCase()} tier (${referralCount} referrals)`,
            metadata: { source: 'ambassador_milestone' },
          });

        // Create milestone notification
        await supabase
          .from('notifications')
          .insert({
            user_id: referrerId,
            type: 'success',
            title: `${milestone.tier.toUpperCase()} Ambassador`,
            body: `You reached ${milestone.tier.toUpperCase()} tier with ${referralCount} referrals. Bonus: +${milestone.bonus} credits.`,
          });

        // Update profile with ambassador tier
        await supabase
          .from('profiles')
          .update({
            metadata: {
              ambassador_tier: milestone.tier,
              referrals_count: referralCount,
            },
          })
          .eq('id', referrerId);
      }
    }
  }
}
