/**
 * FAQ Page - DeBuggAI
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(0);

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
      answer: 'We support 10+ programming languages including JavaScript, TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby, Swift, Kotlin, and C++. We\'re constantly adding support for more languages.',
    },
    {
      question: 'How much does it cost?',
      answer: 'DeBuggAI offers a free forever plan with 30 credits per month. Paid plans start at $9/month for 500 credits. We also offer enterprise plans with unlimited debugging and custom integrations.',
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-5 w-auto" />
            <span className="font-semibold text-base">DeBuggAI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button size="sm" className="h-8 bg-[#00C853] hover:bg-[#00E676] text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about DeBuggAI
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenIndex(index === openIndex ? -1 : index)}
                    className="w-full text-left p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <h3 className="font-semibold pr-4">{faq.question}</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${index === openIndex ? 'rotate-180' : ''}`} />
                  </button>
                  {index === openIndex && (
                    <div className="px-6 pb-6 pt-0 text-muted-foreground">
                      {faq.answer}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <div className="flex gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-[#00C853] hover:bg-[#00E676] text-white">
                  Get Started
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
