'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';
import { useState } from 'react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does DeBuggAI analyze my code?',
      answer: 'DeBuggAI uses advanced AI models to analyze your code in real-time. It identifies syntax errors, logic bugs, performance issues, and security vulnerabilities. Your code is never stored - we analyze it and immediately forget it.',
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
      answer: 'DeBuggAI offers a free forever plan with 30 credits per month. Paid plans start at $9/month for 300 credits. We also offer enterprise plans with unlimited debugging and custom integrations.',
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

  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--app-accent)' }}>
            FAQ
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--app-text)' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-body max-w-lg mx-auto" style={{ color: 'var(--app-text-muted)' }}>
            Everything you need to know about using DeBuggAI
          </p>
        </div>

        {/* Accordion List */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, index) => {
            const isOpen = index === openIndex;

            return (
              <div key={index} className="collapse-item">
                {/* Trigger */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="collapse-trigger w-full flex items-center gap-3 p-4"
                  style={{ 
                    background: isOpen ? 'var(--app-panel-2)' : 'transparent',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit'
                  }}
                >
                  {/* Using the global .collapse-icon class */}
                  <div className="collapse-icon">
                    {isOpen ? '−' : '+'}
                  </div>
                  
                  <span className="text-body font-medium flex-1" style={{ color: 'var(--app-text)' }}>
                    {faq.question}
                  </span>

                  {/* Using the global .collapse-arrow class */}
                  <div 
                    className="collapse-arrow" 
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ↓
                  </div>
                </button>

                {/* Body with smooth height transition */}
                <div
                  className="collapse-body"
                  style={{
                    maxHeight: isOpen ? '500px' : '0px',
                    paddingTop: isOpen ? '0px' : '0px',
                    paddingBottom: isOpen ? '16px' : '0px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    marginLeft: '43px', // Align with text (18px icon + 16px pad + 9px gap)
                    opacity: isOpen ? 1 : 0,
                    transition: 'max-height 0.25s ease, padding 0.25s ease, opacity 0.2s ease',
                    overflow: 'hidden'
                  }}
                >
                  <p className="text-body" style={{ color: 'var(--app-text-muted)', marginTop: 0 }}>
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center mt-16">
          <div style={{ borderTop: '1px solid var(--app-border)', width: '80px', margin: '0 auto 24px auto' }}></div>
          <p className="text-body mb-6" style={{ color: 'var(--app-text-muted)' }}>
            Still have questions?
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup">
              <button className="btn btn-lg btn-primary">
                Get Started Free
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn btn-lg btn-ghost">
                View Pricing
              </button>
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}