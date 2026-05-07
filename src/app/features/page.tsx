import Link from 'next/link';
import { Bug, Zap, Globe, Code2, Shield, Target } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

const features = [
  {
    icon: Bug,
    title: 'AI-Powered Debugging',
    description: 'Instantly identify and fix errors in your code with advanced AI analysis that understands context, not just syntax.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Get results in seconds, not minutes. Our optimized AI pipelines analyze your codebase instantly.',
  },
  {
    icon: Globe,
    title: 'Web Builder',
    description: 'Build production-ready web apps visually with our AI-powered web builder and starter templates.',
  },
  {
    icon: Code2,
    title: '10+ Languages',
    description: 'First-class support for JavaScript, Python, TypeScript, Go, Rust, Java, and more.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your code is never stored permanently. We analyze it in real-time and forget it immediately.',
  },
  {
    icon: Target,
    title: 'Best Practices',
    description: 'Get suggestions that follow industry standards, ensuring your codebase remains clean and maintainable.',
  },
];

export default function FeaturesPage() {
  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
            Features
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>
            Everything you need to debug faster
          </h1>
          <p className="text-body max-w-lg mx-auto" style={{ color: 'var(--app-text-muted)' }}>
            Built for developers who value their time. DeBuggAI integrates seamlessly into your workflow to eliminate tedious troubleshooting.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card card-interactive flex flex-col">
                {/* Card Icon matching global hover state styles */}
                <div 
                  className="card-icon mb-4 flex items-center justify-center"
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    background: 'var(--app-accent-soft)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--app-accent)' }} />
                </div>
                
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-sub mt-1 flex-1">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Developer Experience / Terminal Section */}
        <section className="mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Text */}
            <div>
              <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
                Developer Experience
              </p>
              <h2 className="text-h1 mb-4" style={{ color: 'var(--app-text)' }}>
                Fits right into your workflow
              </h2>
              <p className="text-body mb-6" style={{ color: 'var(--app-text-muted)' }}>
                Don't change how you work. DeBuggAI works with your existing setup, analyzing stack traces, logs, or raw code blocks directly from your terminal or IDE.
              </p>
              <div className="flex flex-col gap-3">
                {['Copy-paste errors for instant fixes', 'Context-aware variable tracking', 'Zero configuration required'].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--app-accent)', flexShrink: 0 }}></div>
                    <span className="text-body" style={{ color: 'var(--app-text)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Terminal UI */}
            <div className="terminal">
              <div className="terminal-header">
                <div className="flex gap-1.5">
                  <div className="code-dot" style={{ background: 'var(--app-danger)' }}></div>
                  <div className="code-dot" style={{ background: 'var(--app-warning)' }}></div>
                  <div className="code-dot" style={{ background: 'var(--app-accent)' }}></div>
                </div>
                <span className="terminal-title">debuggai-cli</span>
              </div>
              <div className="terminal-body">
                <div>
                  <span className="term-prompt">$ </span>
                  <span className="term-cmd">debuggai analyze --file app.js</span>
                </div>
                <div className="term-output mt-2">  Initializing analysis engine...</div>
                <div className="term-output">  Scanning 248 lines of code...</div>
                <div className="term-success mt-2">  ✓ Issue found: TypeError on line 142</div>
                <div className="term-output mt-1">  → Fix: Converted string to integer before calculation.</div>
                <div className="term-success">  ✓ Patch applied successfully.</div>
                <div className="mt-4">
                  <span className="term-prompt">$ </span>
                  <span className="term-cursor"></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <div className="text-center mt-24">
          <div style={{ borderTop: '1px solid var(--app-border)', width: '80px', margin: '0 auto 24px auto' }}></div>
          <h2 className="text-h1 mb-3" style={{ color: 'var(--app-text)' }}>
            Ready to ship faster?
          </h2>
          <p className="text-body max-w-md mx-auto mb-8" style={{ color: 'var(--app-text-muted)' }}>
            Join thousands of developers who debug smarter, not harder.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup">
              <button className="btn btn-lg btn-primary">
                Get Started Free
              </button>
            </Link>
            <Link href="/demo">
              <button className="btn btn-lg btn-ghost">
                Watch Demo
              </button>
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}