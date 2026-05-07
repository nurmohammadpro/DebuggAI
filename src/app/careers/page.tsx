import { Globe, HeartPulse, Rocket, BookOpen, Mail } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

export default function CareersPage() {
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
            Careers
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>
            Build the future of debugging
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--app-text-muted)' }}>
            Join a team of engineers and researchers passionate about making developers&apos; lives better.
          </p>
        </div>

        {/* Open Positions */}
        <section className="mb-16">
          <h2 className="text-h1 mb-6" style={{ color: 'var(--app-text)' }}>Open Positions</h2>
          <div className="card">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-h3" style={{ color: 'var(--app-text)', marginBottom: 0 }}>General Applications</h3>
                  <span className="badge bg-amber">Paused</span>
                </div>
                <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
                  We&apos;re not actively hiring right now, but we&apos;re always looking for exceptional engineers.
                </p>
              </div>
              <a href="mailto:careers@debuggai.com" className="btn btn-primary shrink-0">
                <Mail className="mr-2 h-4 w-4" /> Send Resume
              </a>
            </div>
          </div>
        </section>

        {/* Why DeBuggAI */}
        <section>
          <h2 className="text-h1 mb-6" style={{ color: 'var(--app-text)' }}>Why DeBuggAI?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-sm">
              <Globe className="h-5 w-5 mb-3" style={{ color: 'var(--app-accent)' }} />
              <h3 className="card-title">Remote First</h3>
              <p className="card-sub">Work from anywhere in the world. We&apos;re distributed and async by default.</p>
            </div>
            <div className="card-sm">
              <HeartPulse className="h-5 w-5 mb-3" style={{ color: 'var(--app-accent)' }} />
              <h3 className="card-title">Competitive Benefits</h3>
              <p className="card-sub">Health insurance, equity, and flexible PTO. Take care of yourself first.</p>
            </div>
            <div className="card-sm">
              <Rocket className="h-5 w-5 mb-3" style={{ color: 'var(--app-accent)' }} />
              <h3 className="card-title">Impactful Work</h3>
              <p className="card-sub">Help thousands of developers ship better code every single day.</p>
            </div>
            <div className="card-sm">
              <BookOpen className="h-5 w-5 mb-3" style={{ color: 'var(--app-accent)' }} />
              <h3 className="card-title">Learn & Grow</h3>
              <p className="card-sub">Work on challenging problems with cutting-edge AI technology.</p>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}