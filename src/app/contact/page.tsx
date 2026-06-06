'use client';

import { motion } from 'framer-motion';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';
import { Mail, Headphones, MessageCircle, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@debuggai.com',
    href: 'mailto:hello@debuggai.com',
    color: 'var(--app-accent)',
  },
  {
    icon: Headphones,
    label: 'Support',
    value: 'support@debuggai.com',
    href: 'mailto:support@debuggai.com',
    color: 'var(--app-info)',
  },
  {
    icon: MessageCircle,
    label: 'Twitter',
    value: '@debuggai',
    href: 'https://twitter.com/debuggai',
    color: 'var(--app-purple)',
  },
];

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 70, damping: 16 }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] mb-3">
                Contact
              </div>
              <h1 className="text-[40px] md:text-[56px] font-semibold tracking-[-1.5px] leading-[1.08] max-w-[580px]">
                Talk to{" "}
                <span className="text-[var(--app-accent)]">DeBuggAI</span>
              </h1>
              <p className="mt-5 text-[15px] text-[var(--app-text-muted)] leading-relaxed max-w-[460px]">
                Send product questions, billing issues, partnership notes, or enterprise requirements. We will route it to the right place.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 60, damping: 14 }}
              className="rounded-[10px] border border-[var(--app-border-strong)] bg-[var(--app-panel)] p-6"
            >
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] block mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] block mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] block mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Product question, billing issue, or enterprise request"
                    className="h-10 w-full rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] block mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Share the context, account email if relevant, and what outcome you need."
                    className="w-full rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)] transition-colors resize-y"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-xs font-semibold hover:opacity-90 transition-all active:scale-[0.97] self-start"
                >
                  <Send size={14} />
                  Send Message
                </button>
              </form>
            </motion.div>
          </div>
        </section>

        {/* Other Ways */}
        <section className="bg-[var(--app-panel)]">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <SectionHeader
              tag="Connect"
              title="Direct channels"
              subtitle="Use the address that best matches the kind of help you need."
            />

            <InViewStagger className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-[8px] overflow-hidden border border-[var(--app-border)] bg-[var(--app-border)] mt-10">
              {channels.map((ch) => (
                <FadeItem key={ch.label}>
                  <Link
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="bg-[var(--app-panel-2)] p-7 flex flex-col h-full group"
                  >
                    <div className="w-9 h-9 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center group-hover:border-[var(--app-accent)] transition-colors">
                      <ch.icon size={16} style={{ color: ch.color }} />
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.2px]">{ch.label}</h3>
                    <p className="mt-2 text-[13px] text-[var(--app-text-muted)] leading-relaxed group-hover:text-[var(--app-text)] transition-colors">{ch.value}</p>
                  </Link>
                </FadeItem>
              ))}
            </InViewStagger>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
