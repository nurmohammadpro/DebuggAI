'use client';

import Image from 'next/image';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export const BRAND_NAME = 'DeBuggAI';

interface LogoProps {
  className?: string;
  priority?: boolean;
}

interface BrandLockupProps {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  href?: string;
  label?: string;
}

export function Logo({ className, priority = false }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'light' ? '/DebuggAI-Light.svg' : '/DebuggAI-Dark.svg';

  return (
    <Image
      src={src}
      alt={BRAND_NAME}
      width={24}
      height={24}
      className={cn('h-6 w-6 shrink-0 object-contain', className)}
      priority={priority}
    />
  );
}

export function BrandLockup({
  className,
  logoClassName,
  textClassName,
  label,
}: BrandLockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo className={logoClassName} />
      <span className={cn('text-sm font-semibold tracking-tight text-[var(--app-text)]', textClassName)}>
        {label || BRAND_NAME}
      </span>
    </span>
  );
}
