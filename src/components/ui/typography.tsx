/**
 * Typography Components
 *
 * Consistent typographic components for the DeBuggAI design system.
 */

import { cn } from '@/lib/utils';
import { ReactNode, ElementType } from 'react';

interface TextProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

// Display Text - For hero sections and major headings
export function Display({ children, className }: TextProps) {
  return (
    <h1 className={cn(
      'text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight',
      'text-balance leading-[1.1]',
      className
    )}>
      {children}
    </h1>
  );
}

export function DisplayLg({ children, className }: TextProps) {
  return (
    <h2 className={cn(
      'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
      'text-balance leading-[1.15]',
      className
    )}>
      {children}
    </h2>
  );
}

// Headings
export function Heading({ children, className, as = 'h2' }: Omit<TextProps, 'as'> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn(
      'text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight',
      'text-balance',
      className
    )}>
      {children}
    </Tag>
  );
}

export function Subheading({ children, className }: TextProps) {
  return (
    <h3 className={cn(
      'text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight',
      'text-balance',
      className
    )}>
      {children}
    </h3>
  );
}

export function Title({ children, className }: TextProps) {
  return (
    <h4 className={cn(
      'text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight',
      className
    )}>
      {children}
    </h4>
  );
}

// Body text
export function Body({ children, className, as = 'p' }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn(
      'text-base sm:text-lg leading-relaxed text-foreground/80',
      'max-w-3xl text-justify hyphens-auto',
      className
    )}>
      {children}
    </Tag>
  );
}

export function BodySmall({ children, className, as = 'p' }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn(
      'text-sm sm:text-base leading-relaxed text-foreground/70',
      'max-w-2xl',
      className
    )}>
      {children}
    </Tag>
  );
}

// Lead text - For introductions
export function Lead({ children, className }: TextProps) {
  return (
    <p className={cn(
      'text-xl sm:text-2xl leading-relaxed text-foreground/70',
      'text-justify',
      className
    )}>
      {children}
    </p>
  );
}

// Label / Overline
export function Label({ children, className }: TextProps) {
  return (
    <span className={cn(
      'text-xs font-medium uppercase tracking-wider',
      'text-foreground/60',
      className
    )}>
      {children}
    </span>
  );
}

// Utility text
export function Muted({ children, className, as = 'span' }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </Tag>
  );
}

export function Small({ children, className, as = 'small' }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn('text-sm leading-none', className)}>
      {children}
    </Tag>
  );
}

// Code text
export function Code({ children, className }: TextProps) {
  return (
    <code className={cn(
      'relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm',
      'bg-muted text-foreground',
      'before:content-[""] before:absolute before:inset-0 before:rounded',
      'before:bg-primary/10 before:opacity-0 hover:before:opacity-100',
      'before:transition-opacity',
      className
    )}>
      {children}
    </code>
  );
}

// Blockquote
export function Blockquote({ children, className }: TextProps) {
  return (
    <blockquote className={cn(
      'border-l-4 border-primary pl-4 italic',
      'text-foreground/80',
      className
    )}>
      {children}
    </blockquote>
  );
}

// Link with underline animation
export function LinkText({ children, className, href }: TextProps & { href?: string }) {
  const content = (
    <span className={cn(
      'inline relative',
      'after:content-[""] after:absolute after:-bottom-0.5 after:left-0',
      'after:w-full after:h-0.5 after:bg-primary',
      'after:origin-bottom-right after:scale-x-0',
      'hover:after:origin-bottom-left hover:after:scale-x-100',
      'after:transition-transform after:duration-300',
      className
    )}>
      {children}
    </span>
  );

  return href ? <a href={href}>{content}</a> : content;
}

// Text gradient
export function GradientText({ children, className }: TextProps) {
  return (
    <span className={cn(
      'bg-gradient-to-r from-primary via-purple-500 to-pink-500',
      'bg-clip-text text-transparent',
      'animate-gradient',
      className
    )}>
      {children}
    </span>
  );
}
