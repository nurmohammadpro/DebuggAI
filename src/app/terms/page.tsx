import { PublicLayout } from '@/components/public-layout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>Terms of Service</h1>
          <p className="text-body" style={{ color: 'var(--app-text-dim)' }}>Last updated: April 2026</p>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Acceptance of Terms</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              By accessing or using DeBuggAI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Description of Service</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              DeBuggAI provides AI-powered debugging and code generation services. Your use of our service is at your sole risk. The service is provided &quot;as is&quot; without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>User Responsibilities</h2>
            <ul className="flex flex-col gap-2 pl-5" style={{ listStyleType: 'disc' }}>
              <li className="text-body" style={{ color: 'var(--app-text-muted)' }}>You must be at least 13 years old to use our service</li>
              <li className="text-body" style={{ color: 'var(--app-text-muted)' }}>You are responsible for maintaining the security of your account</li>
              <li className="text-body" style={{ color: 'var(--app-text-muted)' }}>You must not use our service for any illegal or unauthorized purpose</li>
              <li className="text-body" style={{ color: 'var(--app-text-muted)' }}>You remain solely responsible for any code generated or modified using our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Intellectual Property</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              The service, including its original content, features, and functionality, is owned by DeBuggAI and is protected by international copyright, trademark, and other intellectual property laws. You retain ownership of any code you submit for debugging.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Limitation of Liability</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              To the fullest extent permitted by law, DeBuggAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Termination</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              We reserve the right to terminate or suspend your account at any time, with or without cause, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Changes to Terms</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--app-text)' }}>Contact Us</h2>
            <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
              If you have questions about these terms, please contact us at{' '}
              <a href="mailto:legal@debuggai.com" className="footer-link">legal@debuggai.com</a>
            </p>
          </section>
        </div>
        </div>
      </main>
    </PublicLayout>
  );
}
