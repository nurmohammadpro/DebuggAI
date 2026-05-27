'use client';

import { motion } from 'framer-motion';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const languages = [
  { name: 'JavaScript', color: '#F7DF1E', description: 'Node.js, React, Vue, Angular' },
  { name: 'TypeScript', color: '#3178C6', description: 'Type-safe JavaScript development' },
  { name: 'Python', color: '#3776AB', description: 'Django, Flask, FastAPI scripts' },
  { name: 'Go', color: '#00ADD8', description: 'High-performance backend services' },
  { name: 'Rust', color: '#CE422B', description: 'Systems programming and WebAssembly' },
  { name: 'Java', color: '#ED8B00', description: 'Spring Boot, enterprise applications' },
  { name: 'C#', color: '#68217A', description: '.NET applications and services' },
  { name: 'PHP', color: '#777BB4', description: 'WordPress, Laravel, custom apps' },
  { name: 'Ruby', color: '#CC342D', description: 'Rails, Sinatra web applications' },
  { name: 'Swift', color: '#FA7343', description: 'iOS and macOS development' },
  { name: 'Kotlin', color: '#7F52FF', description: 'Android and backend development' },
  { name: 'C++', color: '#00599C', description: 'Performance-critical applications' },
];

export default function LanguagesPage() {
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
                Languages
              </div>
              <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-1.5px] leading-[1.08] max-w-[580px]">
                Debug in any{" "}
                <span className="text-[var(--app-accent)]">language</span>
              </h1>
              <p className="mt-5 text-[15px] text-[var(--app-text-muted)] leading-relaxed max-w-[460px]">
                Debug code in 10+ programming languages with deep AI-powered context analysis.
                Each language gets syntax-aware debugging tuned to its ecosystem.
              </p>
            </motion.div>

            {/* Language pill cloud */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
              className="flex flex-wrap gap-2"
            >
              {languages.slice(0, 6).map((lang) => (
                <span
                  key={lang.name}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[var(--app-border-strong)] bg-[var(--app-panel-2)] text-[12px] font-medium text-[var(--app-text-muted)]"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lang.color }} />
                  {lang.name}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Full grid */}
        <section className="bg-[var(--app-panel)]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <SectionHeader
              tag="Supported Languages"
              title="Full language list"
              subtitle="Each language is paired with an optimized AI debugger that understands its idioms and runtime."
            />

            <InViewStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)] mt-10">
              {languages.map((lang) => (
                <FadeItem key={lang.name}>
                  <div className="bg-[var(--app-panel-2)] p-5 flex items-center gap-4 h-full">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: lang.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[var(--app-text)]">{lang.name}</div>
                      <div className="text-[11px] text-[var(--app-text-dim)] mt-0.5">{lang.description}</div>
                    </div>
                  </div>
                </FadeItem>
              ))}
            </InViewStagger>
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
            <p className="text-sm text-[var(--app-text-muted)] mb-2">
              Don&apos;t see your language?
            </p>
            <p className="text-[12px] text-[var(--app-text-dim)] mb-8">
              We&apos;re constantly adding support for new languages and frameworks.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97]"
            >
              Start Debugging <ArrowRight size={15} />
            </Link>
          </motion.div>
        </section>
      </main>
    </PublicLayout>
  );
}
