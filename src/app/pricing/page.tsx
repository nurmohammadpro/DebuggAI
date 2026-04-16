import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

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
    buttonStyle: 'btn-ghost',
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
    buttonStyle: 'btn-primary',
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
    buttonStyle: 'btn-outline',
    href: '/contact',
    popular: false,
  },
];

// Comparison table data
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

function TableCell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 mx-auto" style={{ color: 'var(--ds-green)' }} />
    ) : (
      <X className="h-4 w-4 mx-auto" style={{ color: 'var(--ds-text3)' }} />
    );
  }
  return <span style={{ color: 'var(--ds-text2)' }}>{value}</span>;
}

export default function PricingPage() {
  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--ds-green)' }}>
            Pricing
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Simple, transparent pricing
          </h1>
          <p className="text-body max-w-md mx-auto" style={{ color: 'var(--ds-text2)' }}>
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-6 transition-all duration-200"
              style={{
                background: 'var(--ds-surface)',
                border: plan.popular
                  ? '1px solid var(--ds-green)'
                  : '1px solid var(--ds-border)',
                borderRadius: 'var(--ds-r12)',
                boxShadow: plan.popular
                  ? '0 0 40px rgba(0,200,83,0.12), var(--ds-shadow-card)'
                  : 'var(--ds-shadow-card)',
                transform: plan.popular ? 'scale(1.03)' : 'scale(1)',
                zIndex: plan.popular ? 10 : 1,
              }}
            >
              {/* Most Popular Badge - Brought up and styled to match border */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span 
                    className="font-medium tracking-wide" 
                    style={{ 
                      fontSize: '11px', 
                      background: 'var(--ds-green)', 
                      color: '#000000',
                      padding: '4px 16px',
                      borderRadius: 'var(--ds-r-pill)',
                      boxShadow: '0 2px 8px rgba(0,200,83,0.3)'
                    }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 
                  className="font-medium tracking-widest uppercase" 
                  style={{ 
                    fontSize: '11px', 
                    color: plan.popular ? 'var(--ds-green)' : 'var(--ds-text3)' 
                  }}
                >
                  {plan.name}
                </h3>
                
                <div className="flex items-baseline gap-1 mt-4">
                  <span 
                    className="font-semibold tracking-tight" 
                    style={{ 
                      fontSize: '32px', 
                      lineHeight: '1.2', 
                      color: 'var(--ds-text)' 
                    }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-body" style={{ color: 'var(--ds-text3)' }}>/mo</span>
                </div>
                
                <p className="text-body mt-2" style={{ color: 'var(--ds-text2)' }}>
                  {plan.description}
                </p>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--ds-border)', margin: '0 0 24px 0' }}></div>

              {/* Features List */}
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3" style={{ fontSize: '13px' }}>
                    {feature.included ? (
                      <Check className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ds-green)' }} />
                    ) : (
                      <X className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--ds-text3)' }} />
                    )}
                    <span style={{ color: feature.included ? 'var(--ds-text2)' : 'var(--ds-text3)' }}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href={plan.href} className="w-full mt-auto">
                <button 
                  className={`btn btn-lg w-full ${plan.buttonStyle}`}
                  style={plan.popular ? {
                    background: 'var(--ds-green)',
                    color: '#000000'
                  } : {}}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison Table Section */}
        <section className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-h1 mb-3" style={{ color: 'var(--ds-text)' }}>
              Compare Plans
            </h2>
            <p className="text-body max-w-md mx-auto" style={{ color: 'var(--ds-text2)' }}>
              A detailed breakdown of what’s included in each tier.
            </p>
          </div>

          <div 
            className="overflow-x-auto rounded-xl border" 
            style={{ 
              borderColor: 'var(--ds-border)', 
              background: 'var(--ds-surface)' 
            }}
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
                  <th 
                    className="text-left p-4 font-medium" 
                    style={{ fontSize: '12px', color: 'var(--ds-text3)', width: '40%' }}
                  >
                    FEATURES
                  </th>
                  <th 
                    className="text-center p-4 font-medium uppercase tracking-wider" 
                    style={{ fontSize: '11px', color: 'var(--ds-text3)' }}
                  >
                    Free
                  </th>
                  <th 
                    className="text-center p-4 font-medium uppercase tracking-wider" 
                    style={{ fontSize: '11px', color: 'var(--ds-green)' }}
                  >
                    Pro
                  </th>
                  <th 
                    className="text-center p-4 font-medium uppercase tracking-wider" 
                    style={{ fontSize: '11px', color: 'var(--ds-text3)' }}
                  >
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr 
                    key={feature.name}
                    style={{ 
                      borderBottom: index === comparisonFeatures.length - 1 ? 'none' : '1px solid var(--ds-border)' 
                    }}
                  >
                    <td 
                      className="p-4" 
                      style={{ fontSize: '13px', color: 'var(--ds-text)' }}
                    >
                      {feature.name}
                    </td>
                    <td className="p-4 text-center">
                      <TableCell value={feature.free} />
                    </td>
                    <td 
                      className="p-4 text-center" 
                      style={{ background: 'var(--ds-green-glow)' }}
                    >
                      <TableCell value={feature.pro} />
                    </td>
                    <td className="p-4 text-center">
                      <TableCell value={feature.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottom FAQ / Trust Note */}
        <div className="text-center mt-16 flex flex-col items-center gap-4">
          <div style={{ borderTop: '1px solid var(--ds-border)', width: '80px' }}></div>
          <p className="text-body max-w-lg mx-auto" style={{ color: 'var(--ds-text3)' }}>
            Have questions about pricing or need a custom setup for your organization? 
            Our team is ready to help you find the perfect plan.
          </p>
          <Link href="/contact">
            <button className="btn btn-ghost">
              Talk to Sales
            </button>
          </Link>
        </div>
      </main>
    </PublicLayout>
  );
}