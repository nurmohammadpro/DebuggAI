'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Bug, Zap, Globe, Code2, Shield, Target, Check, ArrowRight } from 'lucide-react';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';

const features = [
  {
    icon: Bug,
    title: 'Contextual debugging',
    desc: 'Paste an error, stack trace, or code path and get a clear explanation, likely cause, and practical next checks.',
    color: 'var(--app-accent)',
  },
  {
    icon: Zap,
    title: 'Streaming responses',
    desc: 'Assistant replies can appear as they are generated, so you can follow the reasoning instead of waiting on a blank screen.',
    color: 'var(--app-warning)',
  },
  {
    icon: Globe,
    title: 'Web builder workspace',
    desc: 'Generate project files, inspect them in the editor, and use the preview pipeline when the workspace is ready.',
    color: 'var(--app-info)',
  },
  {
    icon: Code2,
    title: 'Multi-language input',
    desc: 'Best suited for JavaScript, TypeScript, React, Next.js, and Python, with snippet-level help for other common languages.',
    color: 'var(--app-purple)',
  },
  {
    icon: Shield,
    title: 'Project history',
    desc: 'Threads, generated files, credits, and project activity stay attached to your account so work can be resumed later.',
    color: 'var(--app-accent)',
  },
  {
    icon: Target,
    title: 'Reviewable suggestions',
    desc: 'AI output is presented as something to inspect, test, and refine, not as an invisible change pushed into production.',
    color: 'var(--app-warning)',
  },
];

export default function FeaturesPage() {
  const dxRef = useRef(null);
  const dxInView = useInView(dxRef, { once: true, margin: '-60px' });

  return (
    <PublicLayout>
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <SectionHeader
            tag="Features"
            title="A focused workspace for debugging and building"
            subtitle="DeBuggAI keeps chat, generated files, preview status, and project actions in one place so the next step stays obvious."
          />

          <InViewStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)] mt-10">
            {features.map((f) => (
              <FadeItem key={f.title}>
                <div className="bg-[var(--app-panel-2)] p-7 flex flex-col h-full">
                  <div className="w-9 h-9 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
                    <f.icon size={16} style={{ color: f.color }} />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.2px]">{f.title}</h3>
                  <p className="mt-2 text-[13px] text-[var(--app-text-muted)] leading-relaxed flex-1">{f.desc}</p>
                </div>
              </FadeItem>
            ))}
          </InViewStagger>
        </section>

        {/* Developer Experience */}
        <section ref={dxRef} className="bg-[var(--app-panel)]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={dxInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, type: 'spring', stiffness: 70, damping: 16 }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
                  Developer Experience
                </div>
                <h2 className="text-[28px] font-semibold tracking-[-0.5px] mb-3">
                  Fits right into your workflow
                </h2>
                <p className="text-sm text-[var(--app-text-muted)] leading-relaxed mb-6 max-w-[480px]">
                  Bring the evidence you already have: a console error, a broken component, a stack trace,
                  or a rough feature prompt. DeBuggAI helps turn that context into reviewable code.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    'Explain likely causes before proposing a patch',
                    'Keep generated files tied to the chat turn',
                    'Move from prompt to preview inside one workspace',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Check size={14} className="text-[var(--app-accent)] shrink-0" />
                      <span className="text-sm text-[var(--app-text)]">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Terminal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={dxInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
                className="rounded-[10px] overflow-hidden border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] shadow-2xl"
              >
                <div className="flex items-center gap-1.5 h-9 px-4 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  <span className="ml-3 text-[10px] font-mono text-[var(--app-text-dim)]">debuggai-cli</span>
                </div>
                <div className="p-5 font-mono text-[12px] leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-[var(--app-accent)]">$</span>
                    <span className="text-[var(--app-text)]">debuggai analyze --file app.js</span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[var(--app-text-dim)]">
                    <div>Initializing analysis engine...</div>
                    <div>Scanning 248 lines of code...</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[var(--app-accent)]">
                    <Check size={13} />
                    <span>Issue found: TypeError on line 142</span>
                  </div>
                  <div className="mt-1 text-[var(--app-text-dim)] ml-5">
                    &rarr; Fix: Converted string to integer before calculation.
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[var(--app-accent)] ml-5">
                    <Check size={13} />
                    <span>Patch applied successfully.</span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <span className="text-[var(--app-accent)]">$</span>
                    <span className="inline-block w-1.5 h-4 bg-[var(--app-accent)] animate-pulse align-middle" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
          >
            <div className="w-20 h-px bg-[var(--app-border)] mx-auto mb-6" />
            <h2 className="text-[32px] font-semibold tracking-[-0.8px] mb-3">Ready to ship faster?</h2>
            <p className="text-sm text-[var(--app-text-muted)] mb-8 max-w-md mx-auto">
              Start with a real bug or a small project prompt and see how the workspace handles it.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Get Started Free <ArrowRight size={15} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] border border-[var(--app-border-strong)] text-sm font-medium hover:bg-[var(--app-panel-2)] transition-all active:scale-[0.97]"
              >
                Watch Demo
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    </PublicLayout>
  );
}
