/**
 * Showcase Card - Enhanced UI Component
 *
 * Demonstrates improved typography, micro-interactions, and visual depth.
 */

'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface ShowcaseCardProps {
  icon?: LucideIcon | ReactNode | ((props?: any) => ReactNode);
  title: string;
  description: string;
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  comingSoon?: boolean;
}

const gradients = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-pink-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  pink: 'from-pink-500 to-rose-500',
};

export function ShowcaseCard({
  icon: Icon,
  title,
  description,
  gradient = 'blue',
  comingSoon = false,
}: ShowcaseCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:-translate-y-2',
        'border-border/50 bg-card/50',
        'backdrop-blur-sm',
        isPressed && 'scale-[0.98]'
      )}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Gradient glow effect on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-10',
          'transition-opacity duration-500',
          'bg-gradient-to-br',
          gradients[gradient]
        )}
      />

      {/* Animated background gradient */}
      <div
        className={cn(
          'absolute -right-16 -top-16 w-32 h-32',
          'bg-gradient-to-br opacity-20 blur-3xl',
          'group-hover:scale-150 transition-transform duration-700',
          gradients[gradient]
        )}
      />

      <CardContent className="relative p-8">
        {/* Icon container with gradient */}
        <div className="mb-6">
          <div
            className={cn(
              'relative inline-flex p-4 rounded-2xl',
              'bg-gradient-to-br shadow-lg',
              'group-hover:shadow-xl group-hover:scale-110',
              'transition-all duration-300 ease-out',
              gradients[gradient]
            )}
          >
            {typeof Icon === 'function' ? (
              <Icon className="h-6 w-6 text-white relative z-10" />
            ) : Icon ? (
              <div className="h-6 w-6 text-white relative z-10 flex items-center justify-center">
                {Icon as ReactNode}
              </div>
            ) : null}

            {/* Shine effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/30 to-transparent" />
          </div>
        </div>

        {/* Typography */}
        <h3 className="text-xl font-semibold tracking-tight mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <p className="text-base leading-relaxed text-muted-foreground mb-6">
          {description}
        </p>

        {/* Action button */}
        {comingSoon ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Coming Soon
          </div>
        ) : (
          <Button
            variant="ghost"
            className={cn(
              'group/btn p-0 h-auto font-medium',
              'hover:bg-transparent'
            )}
          >
            <span className="flex items-center gap-2">
              Learn More
              <span className="transition-transform duration-300 group-hover/btn:translate-x-1">
                →
              </span>
            </span>
          </Button>
        )}

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div
            className={cn(
              'absolute -right-8 -top-8 w-16 h-16',
              'bg-gradient-to-br',
              gradients[gradient],
              'opacity-10 rotate-45'
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Usage example:
export function FeatureShowcase() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need to build faster
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful AI tools to debug, analyze, and generate production-ready code
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <ShowcaseCard
            icon={() => <span className="text-2xl">🐛</span>}
            title="AI Debugging"
            description="Paste your error and get instant fixes with explanations. Supports JavaScript, Python, PHP, Go, Ruby, and more."
            gradient="blue"
          />

          <ShowcaseCard
            icon={() => <span className="text-2xl">⚡</span>}
            title="Web Builder"
            description="Describe what you want to build and watch AI create it in real-time. Live preview with instant hot reload."
            gradient="purple"
          />

          <ShowcaseCard
            icon={() => <span className="text-2xl">🛡️</span>}
            title="Multi-Language"
            description="Automatic language detection and support for 10+ programming languages and frameworks."
            gradient="green"
          />
        </div>
      </div>
    </section>
  );
}
