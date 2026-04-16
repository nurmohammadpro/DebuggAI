/**
 * Careers Page - DeBuggAI
 */

import { PublicLayout } from '@/components/public-layout';

export default function CareersPage() {
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--ds-green)' }}>
            Careers
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Build the future of debugging
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--ds-text2)' }}>
            Join a team of engineers and researchers passionate about making developers' lives better.
          </p>
        </div>

        {/* Open Positions */}
        <section>
          <h2 className="text-h1 mb-6" style={{ color: 'var(--ds-text)' }}>Open Positions</h2>
          <div className="card card-interactive">
            <div className="p-6">
              <p className="text-text3 mb-4">We're not actively hiring right now, but we're always looking for exceptional people.</p>
              <p className="text-body mb-6" style={{ color: 'var(--ds-text2)' }}>
                If you're passionate about developer tools, AI, and making debugging less painful, we'd love to hear from you.
              </p>
              <div className="flex gap-4">
                <a href="mailto:careers@debuggai.com" className="btn btn-primary">
                  Send us your resume
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why DeBuggAI */}
        <section className="mt-16">
          <h2 className="text-h1 mb-6" style={{ color: 'var(--ds-text)' }}>Why DeBuggAI?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-sm">
              <h3 className="card-title">Remote First</h3>
              <p className="card-sub">Work from anywhere in the world. We're distributed and async by default.</p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Competitive Benefits</h3>
              <p className="card-sub">Health insurance, equity, and flexible PTO. Take care of yourself first.</p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Impactful Work</h3>
              <p className="card-sub">Help thousands of developers ship better code every single day.</p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Learn & Grow</h3>
              <p className="card-sub">Work on challenging problems with cutting-edge AI technology.</p>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
