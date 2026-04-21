/**
 * Logo Component
 *
 * Displays the DeBuggAI logo (dark variant).
 */

'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';

export function Logo({ className = '' }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'light' ? '/DebuggAI-Light.svg' : '/DebuggAI-Dark.svg';

  return (
    <Image
      src={src}
      alt="DeBuggAI"
      width={120}
      height={24}
      className={className}
      priority
    />
  );
}
