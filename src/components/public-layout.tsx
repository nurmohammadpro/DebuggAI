/**
 * Public Layout - For unauthenticated pages
 * Includes Navigation and Footer
 */

import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { SessionBootstrapper } from '@/components/auth/session-bootstrapper';

export function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <SessionBootstrapper />
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
