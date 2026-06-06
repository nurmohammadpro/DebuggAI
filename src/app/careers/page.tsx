'use client';

import { motion } from 'framer-motion';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';
import { Globe, Heart, Rocket, BookOpen, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const perks = [
  {
    icon: Globe,
    title: 'Focused remote work',
    desc: 'We value clear writing, calm execution, and strong ownership across time zones.',
    color: 'var(--app-accent)',
  },
  {
    icon: Heart,
    title: 'Sustainable pace',
    desc: 'We prefer deliberate product work over chaotic sprint theater. Good judgment matters here.',
    color: 'var(--app-danger)',
  },
  {
    icon: Rocket,
    title: 'Useful product work',
    desc: 'Work on the core developer loop: context, code generation, preview, billing, and project history.',
    color: 'var(--app-info)',
  },
  {
    icon: BookOpen,
    title: 'Room to grow',
    desc: 'Build across AI, product engineering, infrastructure, and developer experience with direct feedback from users.',
    color: 'var(--app-purple)',
  },
];

export default function CareersPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 70, damping: 16 }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
                Careers
              </div>
              <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-1.5px] leading-[1.08] max-w-[580px]">
                Build tools for developers doing{" "}
                <span className="text-[var(--app-accent)]">real work</span>
              </h1>
              <p className="mt-5 text-[15px] text-[var(--app-text-muted)] leading-relaxed max-w-[460px]">
                We are building a focused workspace for debugging, project generation, preview, and export workflows.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
              className="rounded-[10px] border border-[var(--app-border-strong)] bg-[var(--app-panel)] p-6"
            >
              <h3 className="text-[15px] font-semibold tracking-[-0.2px]">Open Positions</h3>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[var(--app-warning)]" />
                <span className="text-[12px] text-[var(--app-text-dim)]">Not actively hiring right now</span>
              </div>
              <p className="mt-3 text-[13px] text-[var(--app-text-muted)] leading-relaxed">
                We are not actively hiring, but we are open to thoughtful notes from engineers who care
                about developer tools and reliable product execution.
              </p>
              <Link
                href="mailto:careers@debuggai.com"
                className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.97]"
              >
                <Mail size={14} />
                Send a note
                <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Why DeBuggAI */}
        <section className="bg-[var(--app-panel)]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <SectionHeader
              tag="Perks"
              title="How we work"
              subtitle="Small team, practical standards, and a strong preference for shipping things that actually help."
            />

            <InViewStagger className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)] mt-10">
              {perks.map((p) => (
                <FadeItem key={p.title}>
                  <div className="bg-[var(--app-panel-2)] p-7 flex flex-col h-full">
                    <div className="w-9 h-9 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
                      <p.icon size={16} style={{ color: p.color }} />
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.2px]">{p.title}</h3>
                    <p className="mt-2 text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">{p.desc}</p>
                  </div>
                </FadeItem>
              ))}
            </InViewStagger>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
