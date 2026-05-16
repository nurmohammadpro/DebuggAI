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
    name: 'TEAM',
    price: '$99',
    description: 'For small teams',
    features: [
      { text: '2,500 credits/month', included: true },
      { text: '3 seats included', included: true },
      { text: 'Shared team dashboard', included: true },
      { text: 'Web Builder + Export', included: true },
      { text: 'Priority queue', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=team',
    popular: false,
  },
  {
    name: 'BUSINESS',
    price: '$299',
    description: 'For growing organizations',
    features: [
      { text: '10,000 credits/month', included: true },
      { text: '10 seats included', included: true },
      { text: 'Team analytics', included: true },
      { text: 'Priority AI routing', included: true },
      { text: 'Integrations (Git + Deploy)', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=business',
    popular: false,
  },
  {
    name: 'ENTERPRISE',
    price: '$999+',
    description: 'For large orgs and security needs',
    features: [
      { text: 'Starts at 40,000 credits/month', included: true },
      { text: 'Dedicated workspace', included: true },
      { text: 'Admin controls + audit requirements', included: true },
      { text: 'SLA support', included: true },
      { text: 'Private deployment option', included: true },
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=enterprise',
    popular: false,
  },
];

const comparisonFeatures = [
  { name: 'Monthly Credits', free: '30', pro: '300', team: '2,500', business: '10,000', enterprise: '40,000+' },
  { name: 'AI Response Speed', free: 'Standard', pro: 'Priority', team: 'Priority', business: 'Priority routing', enterprise: 'Priority routing' },
  { name: 'History Retention', free: '7 days', pro: '90 days', team: '180 days', business: '365 days', enterprise: '365 days+' },
  { name: 'Core Debugging Engine', free: true, pro: true, team: true, business: true, enterprise: true },
  { name: 'Web Builder', free: false, pro: true, team: true, business: true, enterprise: true },
  { name: 'Starter Templates', free: false, pro: true, team: true, business: true, enterprise: true },
  { name: 'Team Seats Included', free: '1', pro: '1', team: '3', business: '10', enterprise: 'Custom' },
  { name: 'Team Analytics', free: false, pro: false, team: false, business: true, enterprise: true },
  { name: 'Integrations', free: false, pro: false, team: false, business: true, enterprise: true },
  { name: 'SLA Support', free: false, pro: false, team: false, business: true, enterprise: true },
  { name: 'Private Deployment', free: false, pro: false, team: false, business: false, enterprise: true },
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-16 pb-24">
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-6 transition-all duration-200 rounded-[6px]"
              style={{
                background: 'var(--app-panel)',
                border: plan.popular
                  ? '1px solid var(--app-accent)'
                  : '1px solid var(--app-border)',
                zIndex: plan.popular ? 10 : 1,
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span
                    className="font-medium tracking-wide text-[11px] bg-[var(--app-accent)] text-[#071006] px-4 py-1 rounded-[6px]"
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
                  <span className="text-[13px] text-[var(--app-text-muted)]">/mo</span>
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
                      <X className="h-4 w-4 flex-shrink-0 text-[var(--app-text-muted)]" />
                    )}
                    <span style={{ color: feature.included ? 'var(--app-text-muted)' : 'var(--app-text-muted)' }}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href} className="w-full mt-auto">
                <button
                  className="w-full inline-flex items-center justify-center rounded-[6px] px-4 py-2.5 text-[13px] font-medium transition-colors hover:opacity-90"
                  style={plan.popular ? {
                    background: 'var(--app-accent)',
                    color: '#071006'
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
              A detailed breakdown of what is included in each tier.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <th className="text-left p-4 font-medium text-[12px] text-[var(--app-text-muted)]" style={{ width: '40%' }}>
                    FEATURES
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-text-muted)]">
                    Free
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-accent)]">
                    Pro
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-text-muted)]">
                    Team
                  </th>
                  <th className="text-center p-4 font-medium uppercase tracking-[0.12em] text-[11px] text-[var(--app-text-muted)]">
                    Business
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
                      <PricingTableCell value={feature.team} />
                    </td>
                    <td className="p-4 text-center">
                      <PricingTableCell value={feature.business} />
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
            <button className="inline-flex items-center rounded-[6px] px-4 py-2 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
              Talk to Sales
            </button>
          </Link>
        </div>
      </main>
    </PublicLayout>
  );
}
