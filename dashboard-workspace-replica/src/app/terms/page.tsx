import { PublicLayout } from '@/components/public-layout';
import { Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <PublicLayout>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
              <Scale size={12} />
              Legal
            </div>
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.8px] mb-2">
              Terms of Service
            </h1>
            <p className="text-sm text-[var(--app-text-muted)]">Last updated: April 2026</p>
          </div>

          <div className="flex flex-col gap-10">
            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Acceptance of Terms
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                By accessing or using DeBuggAI, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Description of Service
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                DeBuggAI provides AI-powered debugging and code generation services. Your use of our
                service is at your sole risk. The service is provided &quot;as is&quot; without warranty of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                User Responsibilities
              </h2>
              <ul className="flex flex-col gap-2 pl-5 list-disc">
                {[
                  'You must be at least 13 years old to use our service',
                  'You are responsible for maintaining the security of your account',
                  'You must not use our service for any illegal or unauthorized purpose',
                  'You remain solely responsible for any code generated or modified using our service',
                ].map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-[var(--app-text-muted)] pl-1">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Intellectual Property
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                The service, including its original content, features, and functionality, is owned
                by DeBuggAI and is protected by international copyright, trademark, and other
                intellectual property laws. You retain ownership of any code you submit for debugging.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Limitation of Liability
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                To the fullest extent permitted by law, DeBuggAI shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages resulting from your use or
                inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Termination
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                We reserve the right to terminate or suspend your account at any time, with or
                without cause, with or without notice.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Changes to Terms
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                We may update these terms from time to time. Continued use of the service after
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-3 text-[var(--app-text)]">
                Contact Us
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                If you have questions about these terms, please contact us at{' '}
                <a
                  href="mailto:legal@debuggai.com"
                  className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors"
                >
                  legal@debuggai.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
