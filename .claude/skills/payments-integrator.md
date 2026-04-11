---
name: payments-integrator
description: Track 6 - Payments & Credits (P01-P08). Fix Stripe price IDs, wire subscription flow, fix credit wallet issues, add balance display, and low-credit warnings. P1-P2 priority.
type: skill
---

# Payments & Credits Integrator

**Purpose**: Fix Stripe integration, wire subscription flow, resolve credit wallet race conditions, and add balance visibility.

**Priority**: P1-P2 - P01 is P1 (wrong price IDs break checkout). P06 is P1 (credits bug blocks generation).

---

## P01 - Fix Stripe Price IDs in PricingPage

**Time**: 1 hr | **Priority**: P1

**What's broken**: Code passes product IDs (`prod_U28V...`) to checkout. Stripe requires price IDs (`price_xxx`).

**Steps**:
1. Go to Stripe dashboard > Products
2. For each plan (Free, Pro, Enterprise), copy the Price ID (not Product ID)
3. Update in code

**File**: `lib/src/features/pricing/pricing_page.dart`

**Fix**:
```dart
// BEFORE (BAD - using product IDs)
final String monthlyPriceId = 'prod_U28V...';

// AFTER (GOOD - using price IDs)
final String monthlyPriceId = 'price_1ABC...';
final String yearlyPriceId = 'price_1DEF...';

// Also ensure you're getting the correct price for the billing interval
final String selectedPriceId = billingInterval == BillingInterval.monthly
    ? monthlyPriceId
    : yearlyPriceId;
```

**Verification**: Checkout creates correct subscription with proper price.

---

## P02 - Wire All Plan Upgrade Buttons

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/pricing/pricing_page.dart`

**Implementation**:
```dart
class PlanCard extends StatelessWidget {
  final String planName;
  final String priceId;
  final List<String> features;

  Future<void> _handleUpgrade(BuildContext context) async {
    setState(() {
      _isLoading = true;
    });

    try {
      await _checkout(context, priceId, planName);
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Checkout failed: $error')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkout(BuildContext context, String priceId, String planName) async {
    final response = await Supabase.instance.client.functions.invoke(
      'create_subscription_checkout',
      body: {
        'price_id': priceId,
        'plan_name': planName,
      },
    );

    if (response.status != 200) {
      throw Exception('Failed to create checkout session');
    }

    final checkoutUrl = response.data['checkout_url'] as String;

    // Redirect to Stripe Checkout
    if (kIsWeb) {
      // Web: open in same tab
      html.window.location.href = checkoutUrl;
    } else {
      // Mobile: launch URL
      await launchUrl(Uri.parse(checkoutUrl), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          // ... plan details ...
          ElevatedButton(
            onPressed: _isLoading ? null : () => _handleUpgrade(context),
            child: _isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Upgrade to Pro'),
          ),
        ],
      ),
    );
  }
}
```

**Verification**: Clicking upgrade opens Stripe checkout with correct plan.

---

## P03 - Add Stripe Webhook Handlers

**Time**: 1 hr | **Priority**: P1

**File**: `supabase/functions/stripe_webhook/index.ts`

**Implementation**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Stripe } from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  switch (event.type) {
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Get user_id from Stripe customer metadata
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer.metadata.user_id;

      // Update user's plan
      await supabaseClient
        .from('profiles')
        .update({ plan_type: subscription.metadata.plan_name || 'pro' })
        .eq('id', userId);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer.metadata.user_id;

      // Downgrade to free
      await supabaseClient
        .from('profiles')
        .update({ plan_type: 'free' })
        .eq('id', userId);

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer.metadata.user_id;

      // Send notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method.',
          type: 'billing',
        });

      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      // Extend period_end in profiles or subscriptions table
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
```

**Verification**: Test webhooks with Stripe CLI:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe_webhook
stripe trigger customer.subscription.created
```

---

## P04 - Create Upgrade Success Screen

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/pricing/upgrade_success_screen.dart` (new)

**Implementation**:
```dart
class UpgradeSuccessScreen extends StatelessWidget {
  final String? plan;

  static const String route = '/upgrade-success';

  @override
  Widget build(BuildContext context) {
    final planName = plan ?? 'Pro';

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Checkmark animation
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 800),
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: value,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.green,
        shape: BoxShape.circle,
      ),
      child: Icon(Icons.check, size: 48, color: Colors.white),
    ),
  );
},
),

const SizedBox(height: 24),

Text(
  'You are now on $planName!',
  style: Theme.of(context).textTheme.headlineMedium,
  textAlign: TextAlign.center,
),

const SizedBox(height: 16),

Text(
  'Thank you for upgrading. Here are your new benefits:',
  style: TextStyle(color: Colors.grey[600]),
  textAlign: TextAlign.center,
),

const SizedBox(height: 24),

// Feature list
..._buildFeatureList(planName),

const SizedBox(height: 32),

// Updated credit balance
Text(
  'Credits Balance: ${SessionStore.of(context).credits}',
  style: Theme.of(context).textTheme.titleLarge,
),

const SizedBox(height: 32),

ElevatedButton(
  onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
  child: const Text('Go to Dashboard'),
),
],
),
),
),
);
}

List<Widget> _buildFeatureList(String plan) {
  if (plan.toLowerCase() == 'pro') {
    return [
      _buildFeatureItem(Icons.unlimited, 'Unlimited debugging sessions'),
      _buildFeatureItem(Icons.speed, 'Priority AI processing'),
      _buildFeatureItem(Icons.support, 'Priority support'),
      _buildFeatureItem(Icons.history, '90-day session history'),
    ];
  }
  return [];
}

Widget _buildFeatureItem(IconData icon, String text) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        Icon(icon, color: Colors.green),
        const SizedBox(width: 12),
        Text(text),
      ],
    ),
  );
}
}
```

**Verification**: Success screen appears after Stripe checkout redirect.

---

## P05 - Add Cancel/Manage Subscription Flow

**Time**: 2 hr | **Priority**: P2

**File**: `lib/src/features/settings/settings_screen.dart`

**Implementation**:
```dart
class SettingsScreen extends StatelessWidget {
  Future<void> _openCustomerPortal(BuildContext context) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await Supabase.instance.client.functions.invoke(
        'create_customer_portal_session',
      );

      if (response.status != 200) {
        throw Exception('Failed to create portal session');
      }

      final portalUrl = response.data['url'] as String;

      if (kIsWeb) {
        html.window.location.href = portalUrl;
      } else {
        await launchUrl(Uri.parse(portalUrl), mode: LaunchMode.externalApplication);
      }
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to open portal: $error')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionStore.of(context);

    return Scaffold(
      body: ListView(
        children: [
          // ... other settings ...

          if (session.planType != 'free')
            ListTile(
              leading: const Icon(Icons.credit_card),
              title: const Text('Manage Subscription'),
              subtitle: Text('Next billing: ${_formatDate(session.currentPeriodEnd)}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _openCustomerPortal(context),
            ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    return '${DateFormat('MMM d, y').format(date)}';
  }
}
```

**Edge function for portal session**:
```typescript
// supabase/functions/create_customer_portal_session/index.ts
serve(async (req) => {
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('Authorization')!.replace('Bearer ', '')
  );

  // Get stripe_customer_id from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: 'https://yourapp.com/settings',
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## P06 - Fix Credit Wallet Missing Row Bug

**Time**: 1 hr | **Priority**: P1

**What's broken**: First generation fails because no credit_wallet row exists.

**File**: `supabase/functions/generate-web-code/index.ts`

**Fix**:
```typescript
// BEFORE (BAD - fails if wallet doesn't exist)
const { data, error } = await supabaseClient
  .rpc('deduct_credits', {
    p_owner_id: user.id,
    p_amount: 50,
  });

if (error || !data) {
  return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 });
}

// AFTER (GOOD - ensure wallet exists first)
// First, ensure wallet exists
await supabaseClient.rpc('ensure_credit_wallet', {
  p_owner_id: user.id,
});

// Then attempt atomic deduction
const { data, error } = await supabaseClient
  .rpc('deduct_credits', {
    p_owner_id: user.id,
    p_amount: 50,
  });

if (error || !data) {
  return new Response(JSON.stringify({ error: 'Insufficient credits' }), { status: 402 });
}
```

**Add RPC function** (migration):
```sql
CREATE OR REPLACE FUNCTION ensure_credit_wallet(p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO credit_wallets (owner_type, owner_id, balance)
  VALUES ('user', p_owner_id, 30)
  ON CONFLICT (owner_type, owner_id) DO NOTHING;
END;
$$;
```

**Verification**: First generation works for new users.

---

## P07 - Show Credit Balance in AppHeader

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/widgets/app_header.dart`

**Implementation**:
```dart
class AppHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final session = SessionStore.of(context);

    return AppBar(
      title: const Text('DeBuggAI'),
      actions: [
        // Credits pill
        InkWell(
          onTap: () => Navigator.of(context).pushNamed('/credits'),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: Colors.amber.shade100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.bolt, size: 16, color: Colors.amber),
                const SizedBox(width: 4),
                Text(
                  '${session.credits}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(width: 8),

        // ... other actions ...
      ],
    );
  }
}
```

**Verification**: Credits appear in header and update reactively.

---

## P08 - Add Low-Credit Warning Banner

**Time**: 1 hr | **Priority**: P2

**Files**: `lib/src/features/credits/credits_screen.dart` + debug screens

**Implementation**:
```dart
class LowCreditWarningBanner extends StatelessWidget {
  final int currentCredits;
  final int planAllowance;

  bool get shouldShow {
    final threshold = (planAllowance * 0.2).floor();
    return currentCredits < threshold;
  }

  @override
  Widget build(BuildContext context) {
    if (!shouldShow) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.amber.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Running low on credits — top up to avoid interruption',
              style: TextStyle(color: Colors.amber.shade900),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pushNamed('/credits'),
            child: const Text('Top Up'),
          ),
        ],
      ),
    );
  }
}

// Usage in screens
class DebugBuilderScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final session = SessionStore.of(context);
    final planAllowance = session.planType == 'pro' ? 300 : 30;

    return Column(
      children: [
        LowCreditWarningBanner(
          currentCredits: session.credits,
          planAllowance: planAllowance,
        ),
        // ... rest of screen ...
      ],
    );
  }
}
```

**Verification**: Banner appears when credits < 20% of plan allowance.

---

## Completion Checklist

- [ ] P01: Stripe price IDs corrected (not product IDs)
- [ ] P02: All upgrade buttons wired to checkout
- [ ] P03: Webhook handlers for subscription lifecycle
- [ ] P04: Upgrade success screen created
- [ ] P05: Manage subscription flow (P2)
- [ ] P06: Credit wallet initialization fixed
- [ ] P07: Credit balance in AppHeader
- [ ] P08: Low-credit warning banner (P2)

**Next tracks**: Track 7 (Referrals) or Track 8 (Deployment).
