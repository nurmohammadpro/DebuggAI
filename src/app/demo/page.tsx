/**
 * Demo Page - DeBuggAI
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function DemoPage() {
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
            <h1 className="text-4xl font-bold mb-4">Live Demo</h1>
            <p className="text-lg text-muted-foreground">
              Watch how DeBuggAI fixes errors in real-time
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="bg-muted rounded-lg p-6 font-mono text-sm">
                <div className="text-green-500 mb-2">// Error Example</div>
                <div className="text-gray-400">
                  <div>function fetchData() {'{'}</div>
                  <div className="pl-4">const response = await fetch(url);</div>
                  <div className="pl-4">return response.json();</div>
                  <div>{'}'}</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <div className="font-semibold text-green-500 mb-1">DeBuggAI Suggestion</div>
                    <p className="text-sm text-muted-foreground">
                      Missing error handling. Add try-catch to handle potential network errors:
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="text-blue-400 mb-2">// Fixed Code</div>
                  <div className="text-gray-300">
                    <div>async function fetchData(url) {'{'}</div>
                    <div className="pl-4">try {'{'}</div>
                    <div className="pl-8">const response = await fetch(url);</div>
                    <div className="pl-8">if (!response.ok) {'{'}</div>
                    <div className="pl-12">throw new Error('HTTP error! status: ' + response.status);</div>
                    <div className="pl-8">{'}'}</div>
                    <div className="pl-8">return await response.json();</div>
                    <div className="pl-4">{'}'} catch (error) {'{'}</div>
                    <div className="pl-8">console.error('Fetch error:', error);</div>
                    <div className="pl-8">throw error;</div>
                    <div className="pl-4">{'}'}</div>
                    <div>{'}'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">Try it yourself with your code</p>
            <Link href="/signup">
              <Button size="lg" className="bg-[#00C853] hover:bg-[#00E676] text-white">
                Start Debugging Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
