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
    answer: 'DeBuggAI uses advanced AI models to analyze your code in real-time. It identifies syntax errors, logic bugs, performance issues, and security vulnerabilities. Your code is never stored — we analyze it and immediately forget it.',
  },
  {
    question: 'Is my code secure?',
    answer: 'Yes! We take privacy seriously. Your code is analyzed in real-time and never stored on our servers. All communication is encrypted, and we maintain strict security protocols to protect your intellectual property.',
  },
  {
    question: 'What programming languages are supported?',
    answer: 'We support 10+ programming languages including JavaScript, TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby, Swift, Kotlin, and C++. We are constantly adding support for more languages.',
  },
  {
    question: 'How much does it cost?',
    answer: 'DeBuggAI offers a free plan with 30 credits per month. Paid plans start at $9/month for 300 credits, and scale up to Team ($99) and Business ($299). Enterprise starts at $999/month with higher credit bundles and custom requirements.',
  },
  {
    question: 'Can I use DeBuggAI for commercial projects?',
    answer: 'Absolutely! You can use DeBuggAI for both personal and commercial projects. The code suggestions you receive are yours to use however you like.',
  },
  {
    question: 'How accurate are the bug fixes?',
    answer: 'Our AI has been trained on millions of code examples and best practices. It provides highly accurate suggestions, but we always recommend reviewing and testing the fixes before deploying to production.',
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
