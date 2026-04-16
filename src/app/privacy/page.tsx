import { PublicLayout } from '@/components/public-layout';

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>Privacy Policy</h1>
          <p className="text-body" style={{ color: 'var(--ds-text3)' }}>Last updated: April 2026</p>
        </div>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Introduction</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              At DeBuggAI, we take your privacy seriously. This policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Information We Collect</h2>
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-lg" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}>
                <strong className="text-body block mb-1" style={{ color: 'var(--ds-text)' }}>Account Information</strong>
                <p className="text-body" style={{ color: 'var(--ds-text2)', marginTop: 0 }}>When you create an account, we collect your email address, name, and authentication credentials.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}>
                <strong className="text-body block mb-1" style={{ color: 'var(--ds-text)' }}>Code Snippets</strong>
                <p className="text-body" style={{ color: 'var(--ds-text2)', marginTop: 0 }}>We only receive code that you explicitly submit for debugging. Your code is analyzed in real-time and never stored permanently.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}>
                <strong className="text-body block mb-1" style={{ color: 'var(--ds-text)' }}>Usage Data</strong>
                <p className="text-body" style={{ color: 'var(--ds-text2)', marginTop: 0 }}>We collect information about how you use our service, including debug sessions and generated apps, to improve our product.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>How We Use Your Information</h2>
            <ul className="flex flex-col gap-2 pl-5" style={{ listStyleType: 'disc' }}>
              <li className="text-body" style={{ color: 'var(--ds-text2)' }}>To provide, maintain, and improve our services</li>
              <li className="text-body" style={{ color: 'var(--ds-text2)' }}>To process your debugging requests and generate code</li>
              <li className="text-body" style={{ color: 'var(--ds-text2)' }}>To communicate with you about your account</li>
              <li className="text-body" style={{ color: 'var(--ds-text2)' }}>To analyze usage patterns and improve our AI models</li>
            </ul>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Data Retention</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              Your code submissions are processed in real-time and are not permanently stored. Debug sessions and generation history are retained according to your account settings. You can delete your account and all associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-h2 mb-4" style={{ color: 'var(--ds-text)' }}>Security</h2>
            <p className="text-body" style={{ color: 'var(--ds-text2)' }}>
              We implement industry-standard security measures to protect your information. All data is encrypted in transit using HTTPS, and we maintain appropriate administrative and technical safeguards.
            </p>
          </section>

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