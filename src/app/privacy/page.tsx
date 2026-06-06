import { PublicLayout } from '@/components/public-layout';
import { Shield } from 'lucide-react';

const sections = [
  {
    title: 'Information We Collect',
    items: [
      {
        title: 'Account Information',
        desc: 'When you create an account, we collect your email address, name, and authentication credentials.',
      },
      {
        title: 'Code Snippets',
        desc: 'We receive code, prompts, files, logs, and errors that you submit through the product. Some of this data is retained to support project history, previews, exports, and account features.',
      },
      {
        title: 'Usage Data',
        desc: 'We collect information about how you use our service, including debug sessions and generated apps, to improve our product.',
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
              <Shield size={12} />
              Legal
            </div>
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.8px] mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-[var(--app-text-muted)]">Last updated: April 2026</p>
          </div>

          <div className="flex flex-col gap-10">
            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Introduction
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                At DeBuggAI, we take your privacy seriously. This policy explains how we collect, use,
                and protect your information when you use our service.
              </p>
            </section>

            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-4 text-[var(--app-text)]">
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.items.map((item) => (
                    <div
                      key={item.title}
                      className="p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]"
                    >
                      <strong className="text-[13px] font-medium block mb-1 text-[var(--app-text)]">
                        {item.title}
                      </strong>
                      <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                How We Use Your Information
              </h2>
              <ul className="flex flex-col gap-2 pl-5 list-disc">
                {[
                  'To provide, maintain, and improve our services',
                  'To process debugging, builder, preview, and export requests',
                  'To communicate with you about your account',
                  'To understand product usage and improve the service',
                ].map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-[var(--app-text-muted)] pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Data Retention
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                Debug sessions, generated files, project activity, and billing records may be retained
                to provide the service and maintain account history. Account deletion and data removal
                options may vary by plan, legal requirement, and operational need.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Security
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                We use reasonable administrative and technical safeguards to protect your information. All data
                is encrypted in transit using HTTPS, and access is limited to systems and people
                needed to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Contact Us
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                If you have questions about this privacy policy or how we handle your data, please
                contact us at{' '}
                <a
                  href="mailto:privacy@debuggai.com"
                  className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors"
                >
                  privacy@debuggai.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
