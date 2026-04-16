/**
 * Logo Component
 *
 * Displays the DeBuggAI logo (dark variant).
 */

import Image from 'next/image';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/DebuggAI-Dark.svg"
      alt="DeBuggAI"
      width={120}
      height={24}
      className={className}
      priority
    />
  );
}
