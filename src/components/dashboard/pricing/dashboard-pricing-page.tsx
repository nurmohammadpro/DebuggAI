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
  id: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
  name: string;
  price: number;
  credits: number | string;
  period: string;
  features: string[];
  icon: React.ElementType;
  badge?: string;
  priceId?: string;
  cta?: 'checkout' | 'contact' | 'coming-soon';
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
    cta: 'coming-soon',
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
    cta: 'checkout',
  },
  {
    id: 'team',
    name: 'Team',
    price: 99,
    credits: 2500,
    period: 'month',
    icon: Star,
    features: [
      '2,500 credits per month',
      '3 seats included',
      'Shared credit pool',
      'Team dashboard',
      '90-day session history',
      'Priority support',
    ],
    cta: 'coming-soon',
  },
  {
    id: 'business',
    name: 'Business',
    price: 299,
    credits: 10000,
    period: 'month',
    icon: Star,
    features: [
      '10,000 credits per month',
      '10 seats included',
      'Team analytics',
      'Audit logs',
      'Priority build/export',
      'SLA support',
    ],
    cta: 'coming-soon',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    credits: 40000,
    period: 'month',
    icon: Star,
    priceId: 'price_enterprise_monthly',
    features: [
      '40,000 credits per month',
      'SSO / SAML',
      'Advanced security controls',
      'Dedicated support + SLA',
      'Custom integrations',
      'Priority capacity',
    ],
    cta: 'contact',
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

    if (plan.cta === 'contact') {
      router.push('/contact');
      return;
    }

    if (plan.cta === 'coming-soon') {
      toast.message('This plan is coming soon.');
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
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Simple, transparent pricing</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Start free, upgrade when you need more power
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.badge ? 'border-green/30' : ''
            }`}
            style={plan.badge ? { boxShadow: '0 0 0 1px rgba(0,200,83,0.15)' } : undefined}
          >
            <div className={`flex-1 flex flex-col ${plan.badge ? 'pt-10 pb-6 px-4 sm:px-6' : 'p-4 sm:p-6'}`}>
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
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.period}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold" style={{ color: 'var(--ds-green)' }}>
                    {plan.id === 'enterprise'
                      ? '$999+'
                      : `$${plan.price === 0 ? '0' : plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {typeof plan.credits === 'string'
                    ? plan.credits
                    : `${plan.credits.toLocaleString()}`} credits per month
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--ds-green)' }} />
                    <span className="text-muted-foreground">{feature}</span>
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
                ) : plan.cta === 'contact' ? (
                  'Contact Sales'
                ) : plan.cta === 'coming-soon' ? (
                  'Coming Soon'
                ) : plan.id === 'free' ? (
                  'Get Started'
                ) : (
                  'Upgrade'
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold mb-3">Frequently Asked Questions</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold mb-2">What are credits?</h3>
            <p className="text-sm text-muted-foreground">
              Credits are used for AI-powered features. Debugging uses 1 credit per analysis,
              generating code costs 5-20 credits depending on complexity, and web builder projects
              cost 20-100 credits.
            </p>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold mb-2">Do credits roll over?</h3>
            <p className="text-sm text-muted-foreground">
              No, credits reset each billing cycle. However, your history and generated code
              are preserved based on your plan's retention period.
            </p>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can cancel your subscription at any time. Your plan will remain active
              until the end of your billing period.
            </p>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-sm text-muted-foreground">
              We accept all major credit and debit cards through Stripe.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
