import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { PricingTableCell } from '@/components/pricing/table-cell';

const plans = [
  {
    name: 'FREE',
    price: '$0',
    description: 'For individuals learning',
    features: [
      { text: '30 credits/month', included: true },
      { text: 'Basic debugging', included: true },
      { text: '7-day history', included: true },
      { text: 'Web Builder', included: false },
    ],
    cta: 'Get Started',
    href: '/signup',
    popular: false,
  },
  {
    name: 'PRO',
    price: '$9',
    description: 'For serious developers',
    features: [
      { text: '300 credits/month', included: true },
      { text: 'Priority AI responses', included: true },
      { text: '90-day history', included: true },
      { text: 'Web Builder + Templates', included: true },
      { text: 'Zero-Knowledge Mode', included: true },
      { text: 'Referral program', included: true },
    ],
    cta: 'Upgrade to Pro',
    href: '/signup?plan=pro',
    popular: true,
  },
  {
    name: 'ENTERPRISE',
    price: '$49',
    description: 'For teams and organizations',
    features: [
      { text: 'Unlimited credits', included: true },
      { text: 'Dedicated AI instances', included: true },
      { text: 'Unlimited history', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
];

const comparisonFeatures = [
  { name: 'Monthly Credits', free: '30', pro: '300', enterprise: 'Unlimited' },
  { name: 'AI Response Speed', free: 'Standard', pro: 'Priority', enterprise: 'Dedicated' },
  { name: 'History Retention', free: '7 days', pro: '90 days', enterprise: 'Unlimited' },
  { name: 'Core Debugging Engine', free: true, pro: true, enterprise: true },
  { name: 'Web Builder', free: false, pro: true, enterprise: true },
  { name: 'Starter Templates', free: false, pro: true, enterprise: true },
  { name: 'Zero-Knowledge Mode', free: false, pro: true, enterprise: true },
  { name: 'Referral Program', free: false, pro: true, enterprise: true },
  { name: 'API Access', free: false, pro: false, enterprise: true },
  { name: 'Team Collaboration', free: false, pro: false, enterprise: true },
  { name: 'SLA Guarantee', free: false, pro: false, enterprise: true },
  { name: 'Priority Support', free: false, pro: false, enterprise: true },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-16">
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3 text-[var(--app-accent)]">
            Pricing
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight mb-4 text-[var(--app-text)]">
            Simple, transparent pricing
          </h1>
          <p className="text-[13px] max-w-md mx-auto text-[var(--app-text-muted)]">
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-6 transition-all duration-200 rounded-[10px]"
              style={{
                background: 'var(--app-panel)',
                border: plan.popular
                  ? '1px solid var(--app-accent)'
                  : '1px solid var(--app-border)',
                boxShadow: plan.popular
                  ? '0 0 40px rgba(0,200,83,0.12)'
                  : 'none',
                transform: plan.popular ? 'scale(1.03)' : 'scale(1)',
                zIndex: plan.popular ? 10 : 1,
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span
                    className="font-medium tracking-wide text-[11px] bg-[var(--app-accent)] text-black px-4 py-1 rounded-[20px]"
                    style={{ boxShadow: '0 2px 8px rgba(0,200,83,0.3)' }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className="font-medium tracking-[0.12em] uppercase text-[11px]"
                  style={{ color: plan.popular ? 'var(--app-accent)' : 'var(--app-text-dim)' }}
                >
                  {plan.name}
                </h3>

                <div className="flex items-baseline gap-1 mt-4">
                  <span className="font-semibold tracking-tight text-[32px] leading-tight text-[var(--app-text)]">
                    {plan.price}
                  </span>
                  <span className="text-[13px] text-[var(--app-text-dim)]">/mo</span>
                </div>

                <p className="text-[13px] mt-2 text-[var(--app-text-muted)]">
                  {plan.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--app-border)', margin: '0 0 24px 0' }} />

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3 text-[13px]">
                    {feature.included ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-[var(--app-success)]" />
                    ) : (
                      <X className="h-4 w-4 flex-shrink-0 text-[var(--app-text-dim)]" />
                    )}
                    <span style={{ color: feature.included ? 'var(--app-text-muted)' : 'var(--app-text-dim)' }}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href} className="w-full mt-auto">
                <button
                  className="w-full inline-flex items-center justify-center rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors hover:opacity-90"
                  style={plan.popular ? {
                    background: 'var(--app-accent)',
                    color: '#000000'
                  } : {
                    background: 'transparent',
                    color: 'var(--app-text-muted)',
                    border: '1px solid var(--app-border)',
                  }}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>

        <section className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-[24px] font-semibold tracking-tight mb-3 text-[var(--app-text)]">
              Compare Plans
            </h2>
            <p className="text-[13px] max-w-md mx-auto text-[var(--app-text-muted)]">
              A detailed breakdown of what's included in each tier.
            </p>
          </div>

          <div
            className="overflow-x-auto rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]"
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <th className="text-left p-4 font-medium text-[12px] text-[var(--app-text-dim)]" style={{ width: '40%' }}>
                    FEATURES
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-text-dim)]">
                    Free
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-accent)]">
                    Pro
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-text-dim)]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr
                    key={feature.name}
                    style={{
                      borderBottom: index === comparisonFeatures.length - 1 ? 'none' : '1px solid var(--app-border)'
                    }}
                  >
                    <td className="p-4 text-[13px] text-[var(--app-text)]">
                      {feature.name}
                    </td>
                    <td className="p-4 text-center">
                      <PricingTableCell value={feature.free} />
                    </td>
                    <td className="p-4 text-center" style={{ background: 'var(--app-accent-soft)' }}>
                      <PricingTableCell value={feature.pro} />
                    </td>
                    <td className="p-4 text-center">
                      <PricingTableCell value={feature.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="text-center mt-16 flex flex-col items-center gap-4">
          <div style={{ borderTop: '1px solid var(--app-border)', width: '80px' }} />
          <p className="text-[13px] max-w-lg mx-auto text-[var(--app-text-dim)]">
            Have questions about pricing or need a custom setup for your organization?
            Our team is ready to help you find the perfect plan.
          </p>
          <Link href="/contact">
            <button className="inline-flex items-center rounded-[8px] px-4 py-2 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
              Talk to Sales
            </button>
          </Link>
        </div>
      </main>
    </PublicLayout>
  );
}
