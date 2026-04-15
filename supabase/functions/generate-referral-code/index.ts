/**
 * Generate Referral Code Edge Function
 *
 * Generates a unique referral code for a user.
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

    // 2. Check if user already has a referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('code')
      .eq('referrer_id', user.id)
      .single();

    if (existingReferral) {
      return new Response(
        JSON.stringify({
          code: existingReferral.code,
          url: `${req.headers.get('origin') || 'https://debugg.ai'}?ref=${existingReferral.code}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate unique referral code
    let code: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = await generateReferralCode(user.email);

      // Check if code already exists
      const { data: existing } = await supabase
        .from('referrals')
        .select('code')
        .eq('code', code)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique referral code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create referral record
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        code,
        status: 'pending',
      });

    if (insertError) {
      throw insertError;
    }

    // 5. Return referral code and URL
    const origin = req.headers.get('origin') || 'https://debugg.ai';

    return new Response(
      JSON.stringify({
        code,
        url: `${origin}?ref=${code}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Referral code generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate a unique referral code based on user email
 */
async function generateReferralCode(email: string): Promise<string> {
  // Extract username from email
  const username = email.split('@')[0];

  // Clean username: remove special characters, keep only alphanumeric
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Take first 6 characters of username
  const prefix = cleanUsername.slice(0, 6);

  // Generate 3 random characters
  const randomChars = await generateRandomString(3);

  return `${prefix}${randomChars}`.toUpperCase();
}

/**
 * Generate random alphanumeric string
 */
async function generateRandomString(length: number): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0/O, 1/I
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomBuffer = new Uint8Array(1);
    crypto.getRandomValues(randomBuffer);
    result += chars[randomBuffer[0] % chars.length];
  }

  return result;
}
