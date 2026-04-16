/**
 * Privacy Policy Page - DeBuggAI
 */

import { PublicLayout } from '@/components/public-layout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Privacy Policy
          </h1>
          <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
            Last updated: April 2026
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Introduction</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              At DeBuggAI, we take your privacy seriously. This policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Information We Collect</h2>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              <strong style={{ color: 'var(--ds-text)' }}>Account Information:</strong> When you create an account, we collect your email address, name, and authentication credentials.
            </p>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              <strong style={{ color: 'var(--ds-text)' }}>Code Snippets:</strong> We only receive code that you explicitly submit for debugging. Your code is analyzed in real-time and never stored permanently.
            </p>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              <strong style={{ color: 'var(--ds-text)' }}>Usage Data:</strong> We collect information about how you use our service, including debug sessions and generated apps, to improve our product.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>How We Use Your Information</h2>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • To provide, maintain, and improve our services
            </p>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • To process your debugging requests and generate code
            </p>
            <p className="text-body mb-2" style={{ color: 'var(--ds-text2)' }}>
              • To communicate with you about your account
            </p>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              • To analyze usage patterns and improve our AI models
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Data Retention</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              Your code submissions are processed in real-time and are not permanently stored. Debug sessions and generation history are retained according to your account settings. You can delete your account and all associated data at any time.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Security</h2>
            <p className="text-body mb-4" style={{ color: 'var(--ds-text2)' }}>
              We implement industry-standard security measures to protect your information. All data is encrypted in transit using HTTPS, and we maintain appropriate administrative and technical safeguards.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Contact Us</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@debuggai.com" className="footer-link">privacy@debuggai.com</a>
            </p>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
