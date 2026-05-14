/**
 * About Page - DeBuggAI
 */

import { PublicLayout } from '@/components/public-layout';

export default function AboutPage() {
  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
            About
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>
            Debug smarter, build faster
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--app-text-muted)' }}>
            DeBuggAI is an AI-powered development platform built by developers, for developers.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-h1 mb-4" style={{ color: 'var(--app-text)' }}>Our Mission</h2>
          <p className="text-body mb-4" style={{ color: 'var(--app-text-muted)' }}>
            We believe debugging shouldn't be a painful, time-consuming process. DeBuggAI leverages advanced AI to help developers identify and fix errors in seconds, not hours.
          </p>
          <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
            Whether you're debugging JavaScript, Python, Go, or any of the 10+ languages we support, our AI understands context, syntax, and best practices to provide accurate, actionable solutions.
          </p>
        </section>

        {/* Story */}
        <section className="mb-16">
          <h2 className="text-h1 mb-4" style={{ color: 'var(--app-text)' }}>Our Story</h2>
          <p className="text-body mb-4" style={{ color: 'var(--app-text-muted)' }}>
            DeBuggAI was born from frustration. We spent countless hours debugging production issues, tracing through cryptic error messages, and fixing bugs that should have been caught earlier.
          </p>
          <p className="text-body" style={{ color: 'var(--app-text-muted)' }}>
            We knew there had to be a better way. By combining modern AI with deep understanding of programming languages and frameworks, we built a tool that actually helps developers ship better code, faster.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-h1 mb-6" style={{ color: 'var(--app-text)' }}>Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-sm">
              <h3 className="card-title">Developer First</h3>
              <p className="card-sub">Everything we build is designed to make developers' lives easier.</p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Privacy Focused</h3>
              <p className="card-sub">Your code is never stored. We analyze and forget immediately.</p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Quality Over Speed</h3>
              <p className="card-sub">We prioritize accurate, helpful solutions over quick fixes.</p>
            </div>
          </div>
        </section>
        </div>
      </main>
    </PublicLayout>
  );
}
