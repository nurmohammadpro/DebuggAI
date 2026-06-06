'use client';

import { motion } from 'framer-motion';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';
import { Bug, Shield, Zap } from 'lucide-react';

const values = [
  {
    icon: Bug,
    title: 'Developer First',
    desc: 'Everything we build is designed to make developers\' lives easier. We eat our own dogfood every day.',
    color: 'var(--app-accent)',
  },
  {
    icon: Shield,
    title: 'Privacy Focused',
    desc: 'Your code is never stored. We analyze in real-time and forget immediately. Zero-knowledge mode available.',
    color: 'var(--app-info)',
  },
  {
    icon: Zap,
    title: 'Quality Over Speed',
    desc: 'We prioritize accurate, helpful solutions over quick fixes. AI suggestions are always reviewed for correctness.',
    color: 'var(--app-purple)',
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        {/* Hero / Mission */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 70, damping: 16 }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
                About
              </div>
              <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-1.5px] leading-[1.08] max-w-[580px]">
                Debug smarter,{" "}
                <span className="text-[var(--app-accent)]">build faster</span>
              </h1>
              <p className="mt-5 text-[15px] text-[var(--app-text-muted)] leading-relaxed max-w-[460px]">
                DeBuggAI is an AI-powered development platform built by developers, for developers.
                We believe debugging shouldn&apos;t be a painful, time-consuming process.
              </p>
              <p className="mt-3 text-[13px] text-[var(--app-text-dim)] leading-relaxed max-w-[460px]">
                Whether you&apos;re debugging JavaScript, Python, Go, or any of the 10+ languages we support,
                our AI understands context, syntax, and best practices to provide accurate, actionable solutions.
              </p>
            </motion.div>

            {/* Right — stat cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: 'Languages', value: '10+' },
                { label: 'Debug speed', value: '< 3s' },
                { label: 'Accuracy', value: '94%' },
                { label: 'Users', value: '12k+' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] p-5"
                >
                  <div className="text-[28px] font-semibold tracking-[-0.5px] text-[var(--app-accent)]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--app-text-muted)]">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Story */}
        <section className="bg-[var(--app-panel)]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="max-w-4xl mx-auto">
              <InViewStagger>
                <FadeItem>
                  <SectionHeader
                    tag="Our Story"
                    title="Born from frustration"
                    subtitle="DeBuggAI was born from countless hours debugging production issues, tracing through cryptic error messages, and fixing bugs that should have been caught earlier."
                  />
                </FadeItem>
                <FadeItem>
                  <p className="text-sm text-[var(--app-text-muted)] leading-relaxed mt-6">
                    We knew there had to be a better way. By combining modern AI with deep understanding
                    of programming languages and frameworks, we built a tool that actually helps developers
                    ship better code, faster. What started as an internal tool quickly became something
                    bigger — a platform used by thousands of developers worldwide.
                  </p>
                </FadeItem>
              </InViewStagger>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <SectionHeader
            tag="Values"
            title="What drives us"
            subtitle="Three principles guide every decision we make at DeBuggAI."
          />

          <InViewStagger className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)] mt-10">
            {values.map((v) => (
              <FadeItem key={v.title}>
                <div className="bg-[var(--app-panel-2)] p-7 flex flex-col h-full">
                  <div className="w-9 h-9 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
                    <v.icon size={16} style={{ color: v.color }} />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.2px]">{v.title}</h3>
                  <p className="mt-2 text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">{v.desc}</p>
                </div>
              </FadeItem>
            ))}
          </InViewStagger>
        </section>
      </main>
    </PublicLayout>
  );
}
