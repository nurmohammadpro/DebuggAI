import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <div className="text-center max-w-md px-6">
        <div className="text-[64px] font-bold text-[var(--app-text-dim)]/20 mb-4 font-mono">
          404
        </div>
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] mb-2">
          Page not found
        </h1>
        <p className="text-[13px] text-[var(--app-text-muted)] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-9 px-5 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
