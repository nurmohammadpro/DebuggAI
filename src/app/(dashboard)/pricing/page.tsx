/**
 * Pricing Page
 *
 * Display subscription plans with features and checkout buttons.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';

interface Plan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number;
  credits: number | string;
  period: string;
  features: string[];
  icon: React.ElementType;
  badge?: string;
  priceId?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 30,
    period: 'forever',
    icon: Sparkles,
    features: [
      '30 credits per month',
      'Basic debugging features',
      '7-day session history',
      'Web builder templates',
      '10 requests per minute',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    credits: 300,
    period: 'month',
    icon: Zap,
    badge: 'Popular',
    priceId: 'price_pro_monthly',
    features: [
      '300 credits per month',
      'Priority AI processing',
      '90-day session history',
      'Full web builder access',
      'Priority support',
      '30 requests per minute',
      'No rate limiting',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    credits: 'Unlimited',
    period: 'month',
    icon: Star,
    features: [
      'Unlimited credits',
      'Dedicated AI model',
      'Unlimited history',
      'Custom stack templates',
      'SLA guarantee',
      'No rate limiting',
      'Priority support',
      'Custom integrations',
    ],
  },
];

export default function PricingPage() {
  const { user, isAuthenticated } = useSessionStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (plan.id === 'free') {
      toast.info('You are already on the free plan');
      return;
    }

    if (!plan.priceId) {
      toast.error('Plan not available yet');
      return;
    }

    setIsLoading(plan.id);

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          planType: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Checkout failed' }));
        throw new Error(errorData.error || 'Checkout failed');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout session');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Pricing</h1>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current plan:</span>
              <Badge variant={user.plan === 'free' ? 'secondary' : 'default'}>
                {user.plan}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="border-b bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start free, upgrade when you need more power
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.badge ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1">{plan.badge}</Badge>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-lg ${
                    plan.id === 'free' ? 'bg-muted' : 'bg-primary/10'
                  }`}>
                    <plan.icon className={`h-6 w-6 ${
                      plan.id === 'free' ? 'text-muted-foreground' : 'text-primary'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.period}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${plan.price === 0 ? '0' : plan.price}
                    </span>
                    {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.credits === -1 ? 'Unlimited' : `${plan.credits}`} credits per month
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading === plan.id || user?.plan === plan.id}
                  className="w-full"
                  variant={plan.id === 'free' ? 'outline' : 'default'}
                  size="lg"
                >
                  {isLoading === plan.id ? (
                    'Loading...'
                  ) : user?.plan === plan.id ? (
                    'Current Plan'
                  ) : plan.id === 'free' ? (
                    'Downgrade'
                  ) : (
                    'Upgrade'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What are credits?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are used for AI-powered features. Debugging uses 1 credit per analysis,
                generating code costs 5-20 credits depending on complexity, and web builder projects
                cost 20-100 credits.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Do credits roll over?</h3>
              <p className="text-sm text-muted-foreground">
                No, credits reset each billing cycle. However, your history and generated code
                are preserved based on your plan's retention period.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can cancel your subscription at any time. Your plan will remain active
                until the end of your billing period.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit and debit cards through Stripe.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
