'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InViewStagger, FadeItem, SectionHeader } from '@/components/animations';
import { PublicLayout } from '@/components/public-layout';
import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';

const faqs = [
  {
    question: 'How does DeBuggAI analyze my code?',
    answer: 'DeBuggAI sends the context you provide to the configured AI provider, then returns an explanation, likely cause, and suggested next steps. It works best when you include the error, relevant files, and what you expected to happen.',
  },
  {
    question: 'Is my code secure?',
    answer: 'Project data is stored to support history, generated files, previews, billing, and account features. Avoid pasting secrets, private keys, production credentials, or customer data into prompts.',
  },
  {
    question: 'What programming languages are supported?',
    answer: 'The strongest support is for JavaScript, TypeScript, React, Next.js, and Python. Other languages can be analyzed from snippets and logs, but depth of support depends on the context provided.',
  },
  {
    question: 'How much does it cost?',
    answer: 'DeBuggAI offers a free plan with 30 credits per month. Paid plans start at $9/month for 300 credits, and scale up to Team ($99) and Business ($299). Enterprise starts at $999/month with higher credit bundles and custom requirements.',
  },
  {
    question: 'Can I use DeBuggAI for commercial projects?',
    answer: 'Yes, but you remain responsible for reviewing, testing, licensing, and shipping any generated or modified code used in a commercial product.',
  },
  {
    question: 'How accurate are the bug fixes?',
    answer: 'Treat each suggestion like a senior review draft. It can point you toward the likely fix, but you should run tests, inspect the diff, and verify behavior before deploying.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PublicLayout>
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <SectionHeader
            tag="FAQ"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about using DeBuggAI."
          />

          <InViewStagger className="max-w-3xl mx-auto mt-10">
            {faqs.map((faq, index) => {
              const isOpen = index === openIndex;
              return (
                <FadeItem key={index}>
                  <div className="border-b border-[var(--app-border)] last:border-b-0">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center gap-3 py-4 text-left group"
                    >
                      <div
                        className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 transition-all ${
                          isOpen
                            ? 'bg-[var(--app-accent)] text-[#071006]'
                            : 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-dim)] group-hover:border-[var(--app-accent)]'
                        }`}
                      >
                        <Plus
                          size={13}
                          className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
                        />
                      </div>
                      <span
                        className={`text-sm flex-1 transition-colors ${
                          isOpen ? 'text-[var(--app-text)] font-medium' : 'text-[var(--app-text-muted)] group-hover:text-[var(--app-text)]'
                        }`}
                      >
                        {faq.question}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 pl-10">
                            <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeItem>
              );
            })}
          </InViewStagger>
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
            <p className="text-sm text-[var(--app-text-muted)] mb-6">Still have questions?</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Get Started Free <ArrowRight size={15} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-[6px] border border-[var(--app-border-strong)] text-sm font-medium hover:bg-[var(--app-panel-2)] transition-all active:scale-[0.97]"
              >
                View Pricing
              </Link>
            </div>
          </motion.div>
        </section>
      </main>
    </PublicLayout>
  );
}
