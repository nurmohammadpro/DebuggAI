import { PublicLayout } from '@/components/public-layout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase mb-3 text-[var(--app-accent)]">
            Legal
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight mb-4 text-[var(--app-text)]">
            Privacy Policy
          </h1>
          <p className="text-[13px] text-[var(--app-text-muted)]">Last updated: April 2026</p>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              Introduction
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
              At DeBuggAI, we take your privacy seriously. This policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              Information We Collect
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { title: 'Account Information', desc: 'When you create an account, we collect your email address, name, and authentication credentials.' },
                { title: 'Code Snippets', desc: 'We only receive code that you explicitly submit for debugging. Your code is analyzed in real-time and never stored permanently.' },
                { title: 'Usage Data', desc: 'We collect information about how you use our service, including debug sessions and generated apps, to improve our product.' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)]"
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

          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              How We Use Your Information
            </h2>
            <ul className="flex flex-col gap-2 pl-5" style={{ listStyleType: 'disc' }}>
              {[
                'To provide, maintain, and improve our services',
                'To process your debugging requests and generate code',
                'To communicate with you about your account',
                'To analyze usage patterns and improve our AI models',
              ].map((item) => (
                <li key={item} className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              Data Retention
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
              Your code submissions are processed in real-time and are not permanently stored. Debug sessions and generation history are retained according to your account settings. You can delete your account and all associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              Security
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
              We implement industry-standard security measures to protect your information. All data is encrypted in transit using HTTPS, and we maintain appropriate administrative and technical safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-medium tracking-[-0.02em] mb-4 text-[var(--app-text)]">
              Contact Us
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--app-text-muted)]">
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@debuggai.com" className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors">
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
