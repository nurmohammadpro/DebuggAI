/**
 * Terms of Service Page - DeBuggAI
 */

import { PublicLayout } from '@/components/public-layout';

export default function TermsPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Terms of Service
          </h1>
          <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-8">
          {/* Acceptance */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Acceptance of Terms</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              By accessing or using DeBuggAI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Description of Service</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              DeBuggAI provides AI-powered debugging and code generation services. Your use of our service is at your sole risk. The service is provided "as is" without warranty of any kind.
            </p>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>User Responsibilities</h2>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • You must be at least 13 years old to use our service
            </p>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • You are responsible for maintaining the security of your account
            </p>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • You must not use our service for any illegal or unauthorized purpose
            </p>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              • You remain solely responsible for any code generated or modified using our service
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Intellectual Property</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              The service, including its original content, features, and functionality, is owned by DeBuggAI and is protected by international copyright, trademark, and other intellectual property laws. You retain ownership of any code you submit for debugging.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Limitation of Liability</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              To the fullest extent permitted by law, DeBuggAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Termination</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              We reserve the right to terminate or suspend your account at any time, with or without cause, with or without notice.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Changes to Terms</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Contact Us</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              If you have questions about these terms, please contact us at{' '}
              <a href="mailto:legal@debuggai.com" className="footer-link">legal@debuggai.com</a>
            </p>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
