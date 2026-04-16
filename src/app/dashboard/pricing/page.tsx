/**
 * Pricing Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
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
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-border bg-surface/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="h2">Pricing</h1>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text2">Current plan:</span>
              <Badge variant={user.plan === 'free' ? 'gray' : 'green'} pill>
                {user.plan}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="border-b border-border bg-surface/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="badge badge-pill bg-green mb-4" style={{ display: 'inline-flex' }}>
            Pricing
          </div>
          <h2 className="h1 mb-3">Simple, transparent pricing</h2>
          <p className="text-lg text-text2">
            Start free, upgrade when you need more power
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.badge ? 'border-green/30' : ''
              }`}
              style={plan.badge ? { boxShadow: '0 0 0 1px rgba(0,200,83,0.15)' } : undefined}
            >
              <div className={`flex-1 flex flex-col ${plan.badge ? 'pt-10 pb-6 px-6' : 'p-6'}`}>
                {plan.badge && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="green" className="text-xs font-medium" style={{ padding: '4px 16px', fontSize: '11px' }}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-ds" style={{ background: plan.id === 'free' ? 'var(--ds-surface3)' : 'var(--ds-green-muted)' }}>
                    <plan.icon className="h-5 w-5" style={{ color: plan.id === 'free' ? 'var(--ds-text3)' : 'var(--ds-green)' }} />
                  </div>
                  <div>
                    <h3 className="h3">{plan.name}</h3>
                    <p className="text-sm text-text2">{plan.period}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="stat" style={{ color: 'var(--ds-green)' }}>
                      ${plan.price === 0 ? '0' : plan.price}
                    </span>
                    {plan.price > 0 && <span className="text-text2">/month</span>}
                  </div>
                  <p className="text-sm text-text2 mt-1">
                    {plan.credits === -1 ? 'Unlimited' : `${plan.credits}`} credits per month
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-green)' }} />
                      <span className="text-text2">{feature}</span>
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
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="badge badge-pill bg-purple mb-4" style={{ display: 'inline-flex' }}>
              FAQ
            </div>
            <h2 className="h2">Frequently Asked Questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="h3 mb-2">What are credits?</h3>
              <p className="text-sm text-text2">
                Credits are used for AI-powered features. Debugging uses 1 credit per analysis,
                generating code costs 5-20 credits depending on complexity, and web builder projects
                cost 20-100 credits.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="h3 mb-2">Do credits roll over?</h3>
              <p className="text-sm text-text2">
                No, credits reset each billing cycle. However, your history and generated code
                are preserved based on your plan's retention period.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="h3 mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-text2">
                Yes! You can cancel your subscription at any time. Your plan will remain active
                until the end of your billing period.
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="h3 mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-text2">
                We accept all major credit and debit cards through Stripe.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
