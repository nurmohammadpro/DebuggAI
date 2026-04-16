/**
 * Languages Page - DeBuggAI
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function LanguagesPage() {
  const languages = [
    { name: 'JavaScript', icon: '🟨', description: 'Node.js, React, Vue, Angular' },
    { name: 'TypeScript', icon: '🔷', description: 'Type-safe JavaScript development' },
    { name: 'Python', icon: '🐍', description: 'Django, Flask, FastAPI scripts' },
    { name: 'Go', icon: '🐹', description: 'High-performance backend services' },
    { name: 'Rust', icon: '🦀', description: 'Systems programming and WebAssembly' },
    { name: 'Java', icon: '☕', description: 'Spring Boot, enterprise applications' },
    { name: 'C#', icon: '💜', description: '.NET applications and services' },
    { name: 'PHP', icon: '🐘', description: 'WordPress, Laravel, custom apps' },
    { name: 'Ruby', icon: '💎', description: 'Rails, Sinatra web applications' },
    { name: 'Swift', icon: '🍎', description: 'iOS and macOS development' },
    { name: 'Kotlin', icon: '🤖', description: 'Android and backend development' },
    { name: 'C++', icon: '⚡', description: 'Performance-critical applications' },
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
            <h1 className="text-4xl font-bold mb-4">Supported Languages</h1>
            <p className="text-lg text-muted-foreground">
              Debug code in 10+ programming languages with AI-powered analysis
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{lang.icon}</div>
                  <h3 className="text-lg font-semibold mb-1">{lang.name}</h3>
                  <p className="text-sm text-muted-foreground">{lang.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Don't see your language?</p>
            <p className="text-sm text-muted-foreground mb-4">
              We're constantly adding support for more languages. Contact us if you have a specific request.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-[#00C853] hover:bg-[#00E676] text-white">
                Start Debugging
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
