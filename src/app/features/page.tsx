/**
 * Features Page - DeBuggAI
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function FeaturesPage() {
  const features = [
    {
      icon: '🐛',
      title: 'AI-Powered Debugging',
      description: 'Instantly identify and fix errors in your code with advanced AI analysis.',
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Get results in seconds, not minutes. Our AI analyzes your code instantly.',
    },
    {
      icon: '🌐',
      title: 'Web Builder',
      description: 'Build production-ready web apps visually with our AI-powered web builder.',
    },
    {
      icon: '💻',
      title: '10+ Languages',
      description: 'Support for JavaScript, Python, TypeScript, Go, Rust, Java, and more.',
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your code is never stored. We analyze it in real-time and forget it immediately.',
    },
    {
      icon: '🎯',
      title: 'Best Practices',
      description: 'Get suggestions that follow industry best practices and coding standards.',
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Features</h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to debug faster and build better
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Ready to get started?</p>
            <div className="flex gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-[#00C853] hover:bg-[#00E676] text-white">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
