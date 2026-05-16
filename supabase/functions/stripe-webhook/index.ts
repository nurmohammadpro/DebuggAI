/**
 * Stripe Webhook Edge Function
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Updates user plans, credits, and handles subscription changes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configurations
const PLAN_CREDITS = {
  pro: 300,
  team: 2500,
  business: 10000,
  enterprise: 40000,
  free: 30,
};

const PLAN_TYPES = {
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_team_monthly': 'team',
  'price_team_yearly': 'team',
  'price_business_monthly': 'business',
  'price_business_yearly': 'business',
  'price_enterprise_monthly': 'enterprise',
  'price_enterprise_yearly': 'enterprise',
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
    // 1. Verify webhook signature
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // subscription may be a string (ID) when not expanded; prefer session-level metadata
        const metadata =
          typeof session.subscription === 'object' && session.subscription?.metadata
            ? session.subscription.metadata
            : session.metadata;
        const userId = metadata?.supabase_user_id;
        const planType = metadata?.plan_type;

        if (!userId || !planType) {
          console.error('Missing metadata in checkout session', { sessionId: session.id });
          break;
        }

        // Update user plan
        await supabase
          .from('profiles')
          .update({ plan_type: planType })
          .eq('id', userId);

        // Audit: plan change
        await supabase.from('audit_events').insert({
          user_id: userId,
          action: 'plan.updated',
          details: { planType, source: 'stripe_checkout', sessionId: session.id },
          target_type: 'profile',
          target_id: userId,
        });

        // Update credits
        const credits = PLAN_CREDITS[planType as keyof typeof PLAN_CREDITS];
        if (credits > 0) {
          await supabase
            .from('credit_wallets')
            .update({ balance: credits })
            .eq('user_id', userId);

          // Record transaction
          const { data: wallet } = await supabase
            .from('credit_wallets')
            .select('id')
            .eq('user_id', userId)
            .single();
          if (wallet?.id) {
            await supabase.from('credit_transactions').insert({
              wallet_id: wallet.id,
              amount: credits,
              type: 'credit_added',
              description: `Subscribed to ${planType} plan`,
              metadata: { source: 'subscription' },
            });
          }
        }

        console.log(`Checkout completed for user ${userId}, plan ${planType}`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('Profile not found for customer:', customerId);
          break;
        }

        // Determine plan type from price ID
        const planType = PLAN_TYPES[priceId as keyof typeof PLAN_TYPES] || 'free';

        // Update user plan
        await supabase
          .from('profiles')
          .update({ plan_type: planType })
          .eq('id', profile.id);

        // Audit
        await supabase.from('audit_events').insert({
          user_id: profile.id,
          action: 'plan.updated',
          details: { planType, source: 'stripe_subscription', event: event.type, priceId },
          target_type: 'profile',
          target_id: profile.id,
        });

        // Update credits if subscription is active
        if (subscription.status === 'active') {
          const credits = PLAN_CREDITS[planType as keyof typeof PLAN_CREDITS];
          if (credits > 0) {
            await supabase
              .from('credit_wallets')
              .update({ balance: credits })
              .eq('user_id', profile.id);
          }
        }

        console.log(`Subscription ${event.type} for user ${profile.id}, plan ${planType}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('Profile not found for customer:', customerId);
          break;
        }

        // Downgrade to free plan
        await supabase
          .from('profiles')
          .update({ plan_type: 'free' })
          .eq('id', profile.id);

        // Audit
        await supabase.from('audit_events').insert({
          user_id: profile.id,
          action: 'plan.canceled',
          details: { source: 'stripe_subscription_deleted' },
          target_type: 'profile',
          target_id: profile.id,
        });

        // Reset credits to free tier
        await supabase
          .from('credit_wallets')
          .update({ balance: PLAN_CREDITS.free })
          .eq('user_id', profile.id);

        console.log(`Subscription deleted for user ${profile.id}, downgraded to free`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan_type')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('Profile not found for customer:', customerId);
          break;
        }

        // Reset monthly credits for paid plans
        if (profile.plan_type === 'pro' || profile.plan_type === 'team' || profile.plan_type === 'business' || profile.plan_type === 'enterprise') {
          const credits = PLAN_CREDITS[profile.plan_type as keyof typeof PLAN_CREDITS] || PLAN_CREDITS.free;
          await supabase
            .from('credit_wallets')
            .update({ balance: credits })
            .eq('user_id', profile.id);

          // Record transaction
          const { data: wallet } = await supabase
            .from('credit_wallets')
            .select('id')
            .eq('user_id', profile.id)
            .single();
          if (wallet?.id) {
            await supabase.from('credit_transactions').insert({
              wallet_id: wallet.id,
              amount: credits,
              type: 'subscription_reset',
              description: 'Monthly credits reset',
              metadata: { source: 'subscription' },
            });
          }
        }

        console.log(`Payment succeeded for user ${profile.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 4. Return success
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook handler failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
